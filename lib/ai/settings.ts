/**
 * 访客自订的 AI 模型（OpenAI 相容端点）。
 *
 * 设定只存在访客自己的浏览器（localStorage），金钥只会直接送到他填的端点，
 * 不经过本站——本站是纯静态网站，没有伺服器。
 */
import { useSyncExternalStore } from 'react';

export interface AiSettings {
  /** 例：https://api.openai.com/v1（不含 /chat/completions） */
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** 常见服务商的 Base URL；模型名称会变，请按「取得模型清单」从服务商挑，不在这里写死 */
export const PRESETS: { label: string; baseUrl: string; keyless?: boolean }[] = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' },
  { label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { label: 'Ollama（本机）', baseUrl: 'http://localhost:11434/v1', keyless: true },
];

const KEY = 'ziwei-ai-settings';
const OPEN_EVENT = 'ziwei:open-ai-settings';
const listeners = new Set<() => void>();

function read(): AiSettings | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<AiSettings>;
    return { baseUrl: s.baseUrl ?? '', apiKey: s.apiKey ?? '', model: s.model ?? '' };
  } catch {
    return null;
  }
}

let current: AiSettings | null = typeof window === 'undefined' ? null : read();

export function loadAiSettings(): AiSettings | null {
  return current;
}

export function saveAiSettings(s: AiSettings | null) {
  current = s && { baseUrl: s.baseUrl.trim().replace(/\/+$/, ''), apiKey: s.apiKey.trim(), model: s.model.trim() };
  try {
    if (current) localStorage.setItem(KEY, JSON.stringify(current));
    else localStorage.removeItem(KEY);
  } catch { /* 浏览器禁止储存时只在这次浏览有效 */ }
  listeners.forEach(l => l());
}

/** Base URL 与模型名称都填了才算可用；金钥可空（本机 Ollama 等） */
export function isComplete(s: AiSettings | null): s is AiSettings {
  return !!(s?.baseUrl && s.model);
}

export function useAiSettings(): AiSettings | null {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
    () => null,
  );
}

/** 任何地方都能叫出「模型设定」视窗（由 AiSettingsDialog 接收） */
export function openAiSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenAiSettings(fn: () => void): () => void {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
}
