/**
 * AI 解读的统一入口：依环境挑选模型来源。
 *
 * 1. 在 claude.ai 上打开（Artifact）：用 Claude（`sample` 能力），费用记在读者自己的 Claude 帐号；
 *    那里的网页不能连外部网址，所以不用自订端点。
 * 2. 其他地方（GitHub Pages、本机）：用读者在「模型设定」填的 OpenAI 相容端点。
 * 3. 两者都没有：回报 no_provider，画面请读者去设定。
 *
 * 每次呼叫都是独立的、没有记忆，所以命盘资料与规则每次都要放进 input。
 */
import { useEffect, useState } from 'react';
import { AiError, chatOpenAI, type ChatTurn } from './openai';
import { isComplete, loadAiSettings, useAiSettings } from './settings';

export type { ChatTurn };
export { AiError };

type SampleFn = (input: string | ChatTurn[], opts?: {
  onText?: (u: { text: string; delta: string }) => void;
  signal?: AbortSignal;
  cache?: boolean | { gcTime: number };
}) => Promise<{ text: string; truncated: boolean }>;

declare global {
  interface Window { claude?: { use(name: string): Promise<unknown> } }
}

let samplePromise: Promise<SampleFn | null> | null = null;

/** claude.ai 的 sample 能力；不在 claude.ai 上时立即回 null */
export function getSample(): Promise<SampleFn | null> {
  if (!samplePromise) {
    samplePromise = typeof window !== 'undefined' && window.claude?.use
      ? window.claude.use('sample').then(s => (s as SampleFn) ?? null, () => null)
      : Promise.resolve(null);
  }
  return samplePromise;
}

/** 本页是否在 claude.ai 里打开（不必等 sample 解析，可同步判断） */
export function inClaude(): boolean {
  return typeof window !== 'undefined' && !!window.claude?.use;
}

export type AiProvider = { kind: 'claude' } | { kind: 'openai'; model: string };

async function resolveProvider(): Promise<AiProvider | null> {
  if (await getSample()) return { kind: 'claude' };
  const s = loadAiSettings();
  return isComplete(s) ? { kind: 'openai', model: s.model } : null;
}

/** 目前可用的模型来源；undefined = 还在判断 */
export function useAiProvider(): AiProvider | null | undefined {
  const settings = useAiSettings();
  const [provider, setProvider] = useState<AiProvider | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    resolveProvider().then(p => { if (alive) setProvider(p); });
    return () => { alive = false; };
  }, [settings]);
  return provider;
}

export async function askAI(
  input: string | ChatTurn[],
  opts: {
    onText?: (text: string) => void;
    signal?: AbortSignal;
    /** true：每次都重新问（聊天追问）；数字：同一问题在几小时内重用答案（仅 Claude） */
    fresh?: boolean;
    cacheHours?: number;
  } = {},
): Promise<string> {
  const sample = await getSample();
  if (sample) {
    const { text } = await sample(input, {
      onText: opts.onText ? ({ text: t }) => opts.onText!(t) : undefined,
      signal: opts.signal,
      cache: opts.fresh ? false : opts.cacheHours ? { gcTime: opts.cacheHours * 3600_000 } : undefined,
    });
    return text;
  }
  const s = loadAiSettings();
  if (!isComplete(s)) throw new AiError('no_provider');
  return chatOpenAI(s, input, { onText: opts.onText, signal: opts.signal });
}

// ─── 错误说明 ──────────────────────────────────────────────

export const NO_PROVIDER_COPY =
  '要使用 AI 解读，请先到「模型设定」填入 OpenAI 相容的端点、API 金钥与模型名称（只存在你的浏览器）。排盘本身不受影响。';

const CLAUDE_DENIED_COPY =
  'AI 解读需要你在跳出的视窗中允许使用 Claude（费用计入你自己的 Claude 帐号）。排盘本身不受影响。';

/** 这些错误代表「目前用不了 AI」，要读者先处理（设定模型或允许 Claude），不是暂时性失败 */
const UNAVAILABLE = new Set(['no_provider', 'not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed']);

function codeOf(e: unknown): string | undefined {
  return (e as { code?: string })?.code;
}

export function isUnavailable(e: unknown): boolean {
  return UNAVAILABLE.has(codeOf(e) ?? '');
}

/** 是否该引导读者打开「模型设定」 */
export function needsSettings(e: unknown): boolean {
  return ['no_provider', 'auth', 'not_found', 'bad_request', 'network'].includes(codeOf(e) ?? '');
}

/** 给读者看的错误说明 */
export function errorCopy(e: unknown): string {
  const code = codeOf(e);
  const detail = e instanceof AiError && e.message && e.message !== code ? `（${e.message}）` : '';
  switch (code) {
    case 'no_provider': return NO_PROVIDER_COPY;
    case 'auth': return `API 金钥无效或没有权限，请到「模型设定」检查。${detail}`;
    case 'not_found': return `找不到这个端点或模型，请检查 Base URL 与模型名称。${detail}`;
    case 'bad_request': return `服务商拒绝了这次请求，请检查模型名称。${detail}`;
    case 'network': return '连不到你设定的端点：可能是网址有误、网路中断，或服务商不允许浏览器直接呼叫（CORS）。';
    case 'rate_limited': return '使用次数已达上限，请稍后再试。';
    case 'session_expired': return '登入已过期，请重新登入 claude.ai 后再试。';
    case 'refused': return '这个问题模型无法回答，换个问法试试。';
    case 'prompt_too_large': return '内容太长了，请缩短问题或开始新的对话。';
    case 'empty_completion': return '模型没有回传内容，请换个模型或稍后再试。';
  }
  if (isUnavailable(e)) return CLAUDE_DENIED_COPY;
  return `解读中断了，请稍后再试一次。${detail}`;
}
