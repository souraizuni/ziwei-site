'use client';

/**
 * 「模型设定」视窗：读者填自己的 OpenAI 相容端点（Base URL、API 金钥、模型名称）。
 *
 * 全站只挂一个（site/entry.tsx、app/layout.tsx），任何地方呼叫 openAiSettings() 就会打开。
 */
import { useEffect, useRef, useState } from 'react';
import { chatOpenAI, listModels } from '@/lib/ai/openai';
import { errorCopy, inClaude } from '@/lib/ai/client';
import { PRESETS, loadAiSettings, onOpenAiSettings, saveAiSettings, type AiSettings } from '@/lib/ai/settings';

const EMPTY: AiSettings = { baseUrl: '', apiKey: '', model: '' };

type Status = { tone: 'info' | 'ok' | 'error'; text: string } | null;

export default function AiSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AiSettings>(EMPTY);
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState<'' | 'models' | 'test'>('');
  const [status, setStatus] = useState<Status>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<Element | null>(null);

  useEffect(() => onOpenAiSettings(() => {
    returnFocus.current = document.activeElement;
    setForm(loadAiSettings() ?? EMPTY);
    setModels([]); setStatus(null); setShowKey(false);
    setOpen(true);
  }), []);

  useEffect(() => {
    if (!open) return;
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  function close() {
    setOpen(false);
    (returnFocus.current as HTMLElement | null)?.focus?.();
  }

  const set = (k: keyof AiSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const trimmed = (): AiSettings => ({
    baseUrl: form.baseUrl.trim().replace(/\/+$/, ''), apiKey: form.apiKey.trim(), model: form.model.trim(),
  });
  const preset = PRESETS.find(p => p.baseUrl === trimmed().baseUrl);

  const fetchModels = async () => {
    const s = trimmed();
    if (!s.baseUrl) { setStatus({ tone: 'error', text: '请先填 Base URL。' }); return; }
    setBusy('models'); setStatus({ tone: 'info', text: '正在取得模型清单…' });
    try {
      const list = await listModels(s);
      setModels(list);
      setStatus(list.length
        ? { tone: 'ok', text: `找到 ${list.length} 个模型，从下拉选单挑一个。` }
        : { tone: 'error', text: '端点没有回传模型，请直接输入模型名称。' });
    } catch (e) {
      setStatus({ tone: 'error', text: errorCopy(e) });
    } finally {
      setBusy('');
    }
  };

  const test = async () => {
    const s = trimmed();
    if (!s.baseUrl || !s.model) { setStatus({ tone: 'error', text: '请先填 Base URL 与模型名称。' }); return; }
    setBusy('test'); setStatus({ tone: 'info', text: '正在测试连线…' });
    try {
      const reply = await chatOpenAI(s, '请只回覆「连线成功」四个字。');
      setStatus({ tone: 'ok', text: `连线成功，模型回覆：${reply.slice(0, 40)}` });
    } catch (e) {
      setStatus({ tone: 'error', text: errorCopy(e) });
    } finally {
      setBusy('');
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const s = trimmed();
    if (!s.baseUrl || !s.model) { setStatus({ tone: 'error', text: 'Base URL 与模型名称都要填。' }); return; }
    saveAiSettings(s);
    close();
  };

  const clear = () => {
    saveAiSettings(null);
    setForm(EMPTY); setModels([]);
    setStatus({ tone: 'ok', text: '已清除这个浏览器里的模型设定与金钥。' });
  };

  return (
    <div className="ai-dlg-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <form className="ai-dlg" role="dialog" aria-modal="true" aria-labelledby="ai-dlg-title" onSubmit={save}>
        <div className="ai-dlg-head">
          <h2 id="ai-dlg-title">模型设定</h2>
          <button type="button" className="ai-dlg-x" aria-label="关闭" onClick={close}>×</button>
        </div>
        <p className="ai-dlg-lede">
          AI 解读可以使用任何 OpenAI 相容的端点。设定只存在这个浏览器，金钥只会直接送到你填的端点，费用由你的 API 帐号支付。
        </p>
        {inClaude() && (
          <p className="ai-dlg-status ai-dlg-status-info">
            你正在 claude.ai 上浏览，这里会使用 Claude；claude.ai 的页面不能连到外部网址，自订端点只在 GitHub Pages 等一般网址上生效。
          </p>
        )}

        <div className="ai-dlg-field">
          <span className="ai-dlg-label">常用服务商</span>
          <div className="ai-dlg-presets">
            {PRESETS.map(p => (
              <button type="button" key={p.label}
                className={preset === p ? 'ai-dlg-chip ai-dlg-chip-on' : 'ai-dlg-chip'}
                onClick={() => { setForm(f => ({ ...f, baseUrl: p.baseUrl })); setModels([]); setStatus(null); }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label className="ai-dlg-field" htmlFor="ai-base-url">
          <span className="ai-dlg-label">Base URL</span>
          <input ref={firstField} id="ai-base-url" type="url" inputMode="url" autoComplete="off" spellCheck={false}
            placeholder="https://api.openai.com/v1" value={form.baseUrl} onChange={set('baseUrl')} />
          <span className="ai-dlg-hint">填到 /v1 为止，不含 /chat/completions。</span>
        </label>

        <div className="ai-dlg-field">
          <label className="ai-dlg-label" htmlFor="ai-api-key">API 金钥{preset?.keyless ? '（本机模型可留空）' : ''}</label>
          <div className="ai-dlg-row">
            <input id="ai-api-key" type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false}
              placeholder="sk-…" value={form.apiKey} onChange={set('apiKey')} />
            <button type="button" className="ai-dlg-btn" onClick={() => setShowKey(v => !v)}>{showKey ? '隐藏' : '显示'}</button>
          </div>
        </div>

        <div className="ai-dlg-field">
          <label className="ai-dlg-label" htmlFor="ai-model">模型名称</label>
          <div className="ai-dlg-row">
            <input id="ai-model" type="text" autoComplete="off" spellCheck={false}
              placeholder="按右边按钮取得清单，或直接输入" value={form.model} onChange={set('model')} />
            <button type="button" className="ai-dlg-btn" onClick={fetchModels} disabled={busy !== ''}>
              {busy === 'models' ? '取得中…' : '取得模型清单'}
            </button>
          </div>
          {models.length > 0 && (
            <select id="ai-model-list" aria-label="从清单选择模型" value={models.includes(form.model) ? form.model : ''} onChange={set('model')}>
              <option value="">从清单选择…</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>

        {status && <p role="status" className={`ai-dlg-status ai-dlg-status-${status.tone}`}>{status.text}</p>}

        <div className="ai-dlg-actions">
          <button type="button" className="ai-dlg-btn ai-dlg-danger" onClick={clear}>清除设定</button>
          <div className="ai-dlg-actions-right">
            <button type="button" className="ai-dlg-btn" onClick={test} disabled={busy !== ''}>
              {busy === 'test' ? '测试中…' : '测试连线'}
            </button>
            <button type="submit" className="ai-dlg-btn ai-dlg-primary">储存</button>
          </div>
        </div>

        <ul className="ai-dlg-notes">
          <li>在公用电脑上使用完，请按「清除设定」删除金钥。</li>
          <li>测试显示「连不到端点」时，可能是服务商不允许浏览器直接呼叫（CORS）；本机 Ollama 需设定环境变数 OLLAMA_ORIGINS。</li>
        </ul>
      </form>
    </div>
  );
}
