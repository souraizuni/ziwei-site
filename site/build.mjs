/**
 * 打包成单一 HTML（所有 JS、CSS 都内嵌，不需要其他档案）：
 *   node site/build.mjs  →  dist-site/pages/index.html  完整网页：GitHub Pages 部署、本机直接用浏览器打开
 *                           dist-site/index.html        claude.ai Artifact 发布用（不含 <html>/<head>，由平台包外壳）
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as OpenCC from 'opencc-js/cn2t';

const OUT = 'dist-site';
mkdirSync(`${OUT}/pages`, { recursive: true });

// 1) Tailwind（沿用 tailwind.config.ts 与 app/globals.css）
execFileSync('npx', ['tailwindcss', '-c', 'tailwind.config.ts', '-i', 'app/globals.css', '-o', `${OUT}/app.css`, '--minify'], { stdio: 'inherit' });
const css = readFileSync(`${OUT}/app.css`, 'utf8') + readFileSync('site/site.css', 'utf8');

// 2) 程式：next/link、next/navigation 换成单页版替身
await build({
  entryPoints: ['site/entry.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  outfile: `${OUT}/app.js`,
  jsx: 'automatic',
  alias: {
    'next/link': './site/shims/next-link.tsx',
    'next/navigation': './site/shims/next-navigation.ts',
    // patterns.ts / famous.ts 在 Next 版只给服务端用；单页版没有服务端，直接打包进浏览器
    'server-only': './site/shims/empty.ts',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_SITE_URL': '""',
  },
  legalComments: 'none',
  logOverride: { 'module-level-directive': 'silent' },
});
let js = readFileSync(`${OUT}/app.js`, 'utf8');
// 内嵌进 <script> 时不能出现 </script
js = js.replace(/<\/(script)/gi, '<\\/$1');

// 站名取自 lib/site.ts，转繁体后写进 <title>（Artifact 图库以此为名）
const hant = OpenCC.Converter({ from: 'cn', to: 'tw' });
const siteName = hant(readFileSync('lib/site.ts', 'utf8').match(/SITE_NAME = '([^']+)'/)[1]);
const description = hant('输入出生年月日时，即时排出紫微斗数命盘，并可请 AI 依倪海厦体系解读。');

const page = `<title>${siteName}</title>
<meta name="description" content="${description}">
<style>${css}</style>
<div id="root"></div>
<noscript>本站需要啟用 JavaScript。</noscript>
<script>${js}</script>
`;
writeFileSync(`${OUT}/index.html`, page);

// 完整网页（GitHub Pages / 本机）：补上 <head>，内容与 Artifact 版相同
const favicon = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#020810"/><path d="M32 10l5.6 15.4L54 26l-12.8 10 4.6 16L32 42.6 18.2 52l4.6-16L10 26l16.4-.6z" fill="#d4a843"/></svg>')}`;
const standalone = `<!doctype html>
<html lang="zh-Hant-TW" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#020810">
<meta property="og:title" content="${siteName}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<link rel="icon" href="${favicon}">
<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${page}</body>
</html>
`;
writeFileSync(`${OUT}/pages/index.html`, standalone);

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`pages/index.html ${kb(Buffer.byteLength(standalone))}、index.html ${kb(Buffer.byteLength(page))}（JS ${kb(js.length)}，CSS ${kb(css.length)}）`);
