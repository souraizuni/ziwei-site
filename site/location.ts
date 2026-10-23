/**
 * 单页版的「网址」。
 *
 * - 一般网址（GitHub Pages、本机档案）：路径放在网址的 # 后面，例如 index.html#/chart，
 *   可以重新整理、加书签、开新分页；静态主机不需要任何改写规则。
 * - claude.ai 上：页面不能改网址（只认 #token），所以路径存在记忆体里，
 *   用 history.pushState（网址不变、只存 state）让浏览器的「上一页」照常可用。
 *
 * 两种模式都接受 #chart 这类简写，直接开到该页。
 */
import { useSyncExternalStore } from 'react';

export interface Loc { pathname: string; search: string }

const HASH_MODE = !(window as { claude?: { use?: unknown } }).claude?.use;

const HASH_ROUTES: Record<string, string> = {
  chart: '/chart', heming: '/heming', knowledge: '/knowledge', library: '/library', privacy: '/privacy', terms: '/terms',
};

function parse(href: string): Loc {
  const u = new URL(href, 'https://site.local');
  return { pathname: u.pathname.replace(/\/+$/, '') || '/', search: u.search };
}

function fromHash(): Loc | null {
  const h = location.hash;
  if (h.startsWith('#/')) return parse(h.slice(1));
  const token = h.replace(/^#/, '');
  return HASH_ROUTES[token] ? parse(HASH_ROUTES[token]) : null;
}

const pathOf = (l: Loc) => l.pathname + l.search;

let current: Loc = fromHash() ?? parse('/');
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

try { history.replaceState({ path: pathOf(current) }, ''); } catch { /* 沙盒可能禁止 */ }

window.addEventListener('popstate', e => {
  const path = (e.state as { path?: string } | null)?.path;
  const next = typeof path === 'string' ? parse(path) : HASH_MODE ? fromHash() : null;
  if (!next) return;
  current = next;
  emit();
});

// 读者手动改网址的 # 部分
if (HASH_MODE) {
  window.addEventListener('hashchange', () => {
    const next = fromHash() ?? parse('/');
    if (pathOf(next) === pathOf(current)) return;
    current = next;
    emit();
  });
}

/** 连结的 href：一般网址用 #/path，开新分页也能到对的页面 */
export function toHref(path: string): string {
  return HASH_MODE && path.startsWith('/') ? '#' + path : path;
}

export function navigate(href: string, replace = false) {
  const next = parse(href);
  if (pathOf(next) === pathOf(current)) return;
  current = next;
  const url = HASH_MODE ? '#' + pathOf(next) : undefined;
  try {
    if (replace) history.replaceState({ path: pathOf(next) }, '', url);
    else history.pushState({ path: pathOf(next) }, '', url);
  } catch { /* 沙盒可能禁止，退回纯记忆体导航 */ }
  window.scrollTo(0, 0);
  emit();
}

export function useLocation(): Loc {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
  );
}

/** 站内连结（href 为 /path 或 #/path）要改走 navigate 时，回传路径；否则 null */
export function internalPath(e: MouseEvent, a: HTMLAnchorElement): string | null {
  const href = a.getAttribute('href') ?? '';
  const path = href.startsWith('#/') ? href.slice(1) : href;
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (a.target && a.target !== '_self') return null;
  if (a.hasAttribute('download')) return null;
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  return path;
}

document.addEventListener('click', e => {
  if (e.defaultPrevented) return;
  const a = (e.target as Element | null)?.closest?.('a');
  const path = a && internalPath(e, a);
  if (!path) return;
  e.preventDefault();
  navigate(path);
});
