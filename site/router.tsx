/**
 * 单页版路由：沿用 app/ 下各页面元件，路由表对应 Next.js 的档案路由。
 *
 * app/ 里有些页面是 async server component（只 await params、不用 hooks），
 * 在浏览器里直接当函数呼叫拿到 JSX 再渲染；其余页面照常当元件渲染。
 */
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import * as Home from '@/app/page';
import * as Chart from '@/app/chart/page';
import * as Heming from '@/app/heming/page';
import * as KnowledgeHome from '@/app/knowledge/page';
import * as KnowledgeTopic from '@/app/knowledge/[star]/[topic]/page';
import * as LibraryHome from '@/app/library/page';
import * as LibraryBook from '@/app/library/[book]/page';
import * as LibraryChapter from '@/app/library/[book]/[chapter]/page';
import * as LibrarySearchPage from '@/app/library/search/page';
import * as Privacy from '@/app/privacy/page';
import * as Terms from '@/app/terms/page';
import { SITE_NAME } from '@/lib/site';
import { useLocation, type Loc } from './location';
import { NotFoundError } from './shims/next-navigation';
import { toSimplified } from './zh-hant';

interface PageModule {
  default: (props: never) => ReactNode | Promise<ReactNode>;
  metadata?: { title?: string };
  generateMetadata?: (props: never) => Promise<{ title?: string }>;
}

interface Match {
  mod: PageModule;
  /** async server component：先呼叫再渲染 */
  server?: boolean;
  params?: Record<string, string>;
}

const STATIC: Record<string, PageModule> = {
  '/': Home, '/chart': Chart, '/heming': Heming, '/knowledge': KnowledgeHome,
  '/library': LibraryHome, '/privacy': Privacy, '/terms': Terms,
} as unknown as Record<string, PageModule>;

function match(pathname: string): Match | null {
  if (STATIC[pathname]) return { mod: STATIC[pathname] };
  if (pathname === '/library/search') return { mod: LibrarySearchPage as unknown as PageModule, server: true };
  let m = pathname.match(/^\/knowledge\/([^/]+)\/([^/]+)$/);
  if (m) return { mod: KnowledgeTopic as unknown as PageModule, server: true, params: { star: m[1], topic: m[2] } };
  m = pathname.match(/^\/library\/([^/]+)\/(\d+)$/);
  if (m) return { mod: LibraryChapter as unknown as PageModule, server: true, params: { book: m[1], chapter: m[2] } };
  m = pathname.match(/^\/library\/([^/]+)$/);
  if (m) return { mod: LibraryBook as unknown as PageModule, server: true, params: { book: m[1] } };
  return null;
}

function pageProps(loc: Loc, params: Record<string, string> = {}) {
  const sp = Object.fromEntries(new URLSearchParams(loc.search));
  // 读者输入的繁体搜索词，转回简体再查（古籍资料是简体）
  if (sp.q) sp.q = toSimplified(sp.q);
  return { params: Promise.resolve(params), searchParams: Promise.resolve(sp) };
}

function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg-page)', color: 'var(--tx-1)' }}>
      <div style={{ fontSize: 13, letterSpacing: '0.3em', color: 'var(--ac)' }}>找不到这一页</div>
      <a href="/" style={{ fontSize: 14, color: 'var(--tx-2)' }}>回首页</a>
    </main>
  );
}

async function resolveTitle(mod: PageModule, props: ReturnType<typeof pageProps>): Promise<string | undefined> {
  if (mod.generateMetadata) {
    try { return (await mod.generateMetadata(props as never))?.title; } catch { return undefined; }
  }
  return mod.metadata?.title;
}

export function App() {
  const loc = useLocation();
  const m = match(loc.pathname);
  const [serverEl, setServerEl] = useState<{ key: string; el: ReactNode } | null>(null);
  const key = loc.pathname + loc.search;

  useEffect(() => {
    let alive = true;
    if (!m) { document.title = SITE_NAME; return; }
    const props = pageProps(loc, m.params);
    resolveTitle(m.mod, props).then(t => {
      if (alive) document.title = t ? (t.includes(SITE_NAME) ? t : `${t} · ${SITE_NAME}`) : SITE_NAME;
    });
    if (m.server) {
      Promise.resolve()
        .then(() => m.mod.default(props as never))
        .then(el => { if (alive) setServerEl({ key, el }); })
        .catch(err => {
          if (!(err instanceof NotFoundError)) console.error(err);
          if (alive) setServerEl({ key, el: <NotFound /> });
        });
    }
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!m) return <NotFound />;
  if (m.server) return serverEl?.key === key ? <>{serverEl.el}</> : null;
  const Page = m.mod.default as ComponentType;
  return <Page key={key} />;
}
