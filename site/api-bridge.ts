/**
 * 开源版没有后端；/api/interpret（单盘解读）与 /api/heming（合盘）这两个请求
 * 在浏览器里接下来，改由 lib/ai/client.ts 回答（claude.ai 上用 Claude，其他地方用读者设定的
 * OpenAI 相容端点），并照原本的 SSE 格式（data: {"delta":{"text":…}}）回传，元件不必改解析逻辑。
 *
 * 失败时：404 = 目前用不了 AI（没设定模型或没允许 Claude），其他 = 502；
 * 标头 x-ai-error 带给读者看的说明（URI 编码），x-ai-settings = 1 表示该引导去「模型设定」。
 */
import { askAI, errorCopy, isUnavailable, needsSettings, type ChatTurn } from '@/lib/ai/client';
import { buildHemingInput, buildInterpretInput } from '@/lib/ai/chart-prompts';
import type { ZiweiChart } from '@/lib/ziwei/types';

const enc = new TextEncoder();
const sse = (obj: unknown) => enc.encode(`data: ${typeof obj === 'string' ? obj : JSON.stringify(obj)}\n\n`);

function stream(input: string | ChatTurn[], signal?: AbortSignal | null): Promise<Response> {
  return new Promise(resolve => {
    let ctrl: ReadableStreamDefaultController<Uint8Array> | null = null;
    let sent = '';
    let started = false;
    const body = new ReadableStream<Uint8Array>({ start(c) { ctrl = c; } });

    const start = () => {
      if (started) return;
      started = true;
      resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
    };

    askAI(input, {
      signal: signal ?? undefined,
      onText: text => {
        // 新文字一律接在尾端（思考段落在 lib/ai/openai.ts 已滤掉），只送多出来的部分
        if (!text.startsWith(sent)) return;
        const delta = text.slice(sent.length);
        sent = text;
        start();
        if (delta) ctrl!.enqueue(sse({ delta: { text: delta } }));
      },
    }).then(() => {
      start();
      ctrl!.enqueue(sse('[DONE]'));
      ctrl!.close();
    }, err => {
      if (started) { ctrl!.close(); return; } // 已经有部分内容：保留在画面上
      resolve(new Response(null, {
        status: isUnavailable(err) ? 404 : 502,
        headers: { 'x-ai-error': encodeURIComponent(errorCopy(err)), 'x-ai-settings': needsSettings(err) ? '1' : '0' },
      }));
    });
  });
}

export function installApiBridge() {
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = url.startsWith('/') ? url.split('?')[0] : '';
    if ((path === '/api/interpret' || path === '/api/heming') && typeof init?.body === 'string') {
      const body = JSON.parse(init.body);
      if (path === '/api/interpret') {
        const { chart, messages } = body as { chart: ZiweiChart; messages: ChatTurn[] };
        return stream(buildInterpretInput(chart, messages), init.signal);
      }
      const { chartA, chartB, question } = body as { chartA: ZiweiChart; chartB: ZiweiChart; question?: string };
      return stream(buildHemingInput(chartA, chartB, question), init.signal);
    }
    return original(input, init);
  };
}
