/** 单页版入口：claude.ai Artifact 发布用（见 site/build.mjs） */
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/components/ThemeProvider';
import AiSettingsDialog from '@/components/AiSettingsDialog';
import { installHant } from './zh-hant';
import { installApiBridge } from './api-bridge';
import { App } from './router';

document.documentElement.lang = 'zh-Hant-TW';

// 主题：读者在本站选过的优先；否则跟 claude.ai 的明暗设定；都没有就用本站预设的暗色
try {
  const saved = localStorage.getItem('ziwei-theme');
  const host = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme',
    saved === 'light' || saved === 'dark' ? saved : host === 'light' ? 'light' : 'dark');
} catch {
  document.documentElement.setAttribute('data-theme', 'dark');
}

installHant();
installApiBridge();

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
    <AiSettingsDialog />
  </ThemeProvider>,
);
