/**
 * OpenAI 相容端点（/chat/completions、/models），在浏览器里直接呼叫。
 *
 * 服务商必须允许浏览器跨来源呼叫（CORS）；不允许时 fetch 会直接失败，
 * 这里统一回报成 code = 'network'，由画面提示读者。
 */
import type { AiSettings } from './settings';

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

/** 与 Claude sample 的错误同形（code / message / text），画面只需一套错误处理 */
export class AiError extends Error {
  constructor(public code: string, message = '', public text?: string) {
    super(message || code);
  }
}

function headers(s: AiSettings): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (s.apiKey) h.Authorization = `Bearer ${s.apiKey}`;
  return h;
}

async function httpError(res: Response): Promise<AiError> {
  let detail = '';
  try {
    const body = await res.text();
    try {
      const j = JSON.parse(body);
      detail = j?.error?.message ?? j?.message ?? body;
    } catch {
      detail = body;
    }
  } catch { /* 读不到内文就只用状态码 */ }
  detail = String(detail).slice(0, 300);
  const code = res.status === 401 || res.status === 403 ? 'auth'
    : res.status === 404 ? 'not_found'
    : res.status === 429 ? 'rate_limited'
    : res.status >= 400 && res.status < 500 ? 'bad_request'
    : 'upstream_error';
  return new AiError(code, detail || `HTTP ${res.status}`);
}

function fetchError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if ((e as { name?: string })?.name === 'AbortError') return new AiError('cancelled');
  return new AiError('network', e instanceof Error ? e.message : String(e));
}

/**
 * 推理模型（如 deepseek-r1 系列在 Ollama 上）会把思考过程放在 <think>…</think>，不显示给读者。
 * 串流时标签可能被切开（先收到「<thi」），尾端不完整的标签也先藏起来，
 * 这样显示的文字只会往后长，不会回头改写（site/api-bridge.ts 依赖这点）。
 */
function visible(text: string): string {
  return text
    .replace(/<think>[\s\S]*?(<\/think>|$)/g, '')
    .replace(/<(?:t(?:h(?:i(?:n(?:k)?)?)?)?)?$/, '')
    .trimStart();
}

/** 连续同一角色的讯息合并成一则：部分服务商不接受连续两则 user */
function normalize(turns: ChatTurn[]): ChatTurn[] {
  const out: ChatTurn[] = [];
  for (const t of turns) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) last.content += '\n\n' + t.content;
    else out.push({ ...t });
  }
  return out;
}

export async function chatOpenAI(
  s: AiSettings,
  input: string | ChatTurn[],
  opts: { onText?: (text: string) => void; signal?: AbortSignal } = {},
): Promise<string> {
  const messages = normalize(typeof input === 'string' ? [{ role: 'user', content: input }] : input);
  let res: Response;
  try {
    res = await fetch(`${s.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: headers(s),
      body: JSON.stringify({ model: s.model, messages, stream: true }),
      signal: opts.signal,
    });
  } catch (e) {
    throw fetchError(e);
  }
  if (!res.ok) throw await httpError(res);

  // 少数端点忽略 stream，直接回整包 JSON
  if (!res.body || (res.headers.get('content-type') ?? '').includes('application/json')) {
    const j = await res.json();
    const text = visible(j?.choices?.[0]?.message?.content ?? '');
    if (!text) throw new AiError('empty_completion');
    opts.onText?.(text);
    return text;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let raw = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        let j: { error?: { message?: string }; choices?: { delta?: { content?: string } }[] };
        try { j = JSON.parse(data); } catch { continue; }
        if (j.error) throw new AiError('upstream_error', j.error.message ?? '', visible(raw));
        const delta = j.choices?.[0]?.delta?.content;
        if (delta) {
          raw += delta;
          const text = visible(raw);
          if (text) opts.onText?.(text);
        }
      }
    }
  } catch (e) {
    const err = fetchError(e);
    err.text ??= visible(raw);
    throw err;
  }
  const text = visible(raw);
  if (!text) throw new AiError('empty_completion');
  return text;
}

/** 端点提供的模型清单（GET /models） */
export async function listModels(s: Pick<AiSettings, 'baseUrl' | 'apiKey'>): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(`${s.baseUrl.replace(/\/+$/, '')}/models`, { headers: headers({ ...s, model: '' }) });
  } catch (e) {
    throw fetchError(e);
  }
  if (!res.ok) throw await httpError(res);
  const j = await res.json();
  const ids = (j?.data ?? j?.models ?? [])
    .map((m: { id?: string; name?: string }) => m.id ?? m.name)
    .filter(Boolean)
    // Gemini 的清单带「models/」前缀，呼叫时不需要
    .map((id: string) => id.replace(/^models\//, ''));
  return [...new Set<string>(ids)].sort();
}
