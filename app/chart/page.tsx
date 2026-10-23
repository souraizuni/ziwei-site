'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import BirthForm, { type BirthFormState } from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import InsightPanel from '@/components/InsightPanel';
import { generateChart } from '@/lib/ziwei/algorithm';
import { useHistory } from '@/lib/ziwei/history';
import { SITE_NAME } from '@/lib/site';
import { inClaude } from '@/lib/ai/client';
import { openAiSettings } from '@/lib/ai/settings';
import type { BirthInfo, ZiweiChart, Palace } from '@/lib/ziwei/types';

/**
 * 命盘页：出生资料 → 命盘方格 + AI 解读。
 *
 * 本命 / 大限 / 流年切换在 ChartBoard 内；点宫位会标出三方四正，
 * 并在右侧解读面板提供「解读此宫」。宽萤幕左右两栏，窄萤幕上下排。
 */
export default function ChartPage() {
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [error, setError] = useState('');
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [prefill, setPrefill] = useState<{ key: string; form: BirthFormState } | null>(null);
  const { history, save, remove } = useHistory();
  const lastForm = useRef<BirthFormState | null>(null);

  const submit = (info: BirthInfo) => {
    try {
      setChart(generateChart(info));
      setError('');
      if (lastForm.current) save(lastForm.current);
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '排盘失败，请检查出生日期是否正确。');
    }
  };

  const nav = (
    <nav className="chart-nav">
      <Link href="/" className="chart-nav-brand">{SITE_NAME}</Link>
      <div className="chart-nav-links">
        {chart && (
          <button type="button" onClick={() => { setChart(null); setSelectedPalace(null); }}>重新起盘</button>
        )}
        <Link href="/heming">合盘</Link>
        <Link href="/knowledge">百科</Link>
        {!inClaude() && <button type="button" onClick={openAiSettings}>模型</button>}
      </div>
    </nav>
  );

  // ── 未起盘：出生资料表单 ──
  if (!chart) {
    return (
      <div className="chart-page">
        {nav}
        <main className="chart-form-wrap">
          <h1>紫微斗数排盘</h1>
          <p className="chart-lede">
            输入出生年月日时与出生地，即时排出命盘；出生地用于真太阳时校正。
          </p>
          <BirthForm
            key={prefill?.key ?? 'new'}
            initialData={prefill?.form}
            onFormSave={f => { lastForm.current = f; }}
            onSubmit={submit}
          />
          {error && <p className="chart-error">{error}</p>}

          {history.length > 0 && (
            <section className="chart-history">
              <h2>最近排过的命盘</h2>
              <ul>
                {history.map(h => (
                  <li key={h.id}>
                    <button type="button" className="chart-history-item"
                      onClick={() => { setPrefill({ key: h.id + Date.now(), form: h.form }); window.scrollTo(0, 0); }}>
                      {h.label}
                    </button>
                    <button type="button" className="chart-history-remove" aria-label="删除这笔纪录" onClick={() => remove(h.id)}>×</button>
                  </li>
                ))}
              </ul>
              <p className="chart-history-note">纪录只存在这个浏览器里，点选后会带入上方表单。</p>
            </section>
          )}
        </main>
      </div>
    );
  }

  // ── 已起盘：命盘 + 解读 ──
  const b = chart.birthInfo;
  return (
    <div className="chart-page">
      {nav}
      <main className="chart-result">
        <div className="chart-result-head">
          {b.name && <span className="chart-result-name">{b.name}</span>}
          <span>{b.year} 年 {b.month} 月 {b.day} 日 · {b.gender === 'male' ? '男' : '女'}{b.city ? ` · ${b.city}` : ''}</span>
          <span>{chart.wuxingJuName}</span>
        </div>
        <div className="chart-grid">
          <div className="chart-board-col">
            <ChartBoard chart={chart} onPalaceSelect={setSelectedPalace} />
          </div>
          <div className="chart-insight-col">
            <InsightPanel chart={chart} selectedPalace={selectedPalace} />
          </div>
        </div>
      </main>
    </div>
  );
}
