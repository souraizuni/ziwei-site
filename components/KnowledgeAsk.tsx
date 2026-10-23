'use client';

/**
 * 知识库专题页（断语库未开源时的替代）：主星 × 宫位，由 Claude 即时讲解。
 *
 * 按下按钮才发问（费用记在读者自己的 Claude 帐号或自订端点）；在 claude.ai 上同一专题 24 小时内重看不再计费。
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { askAI, errorCopy, needsSettings, useAiProvider, NO_PROVIDER_COPY } from '@/lib/ai/client';
import { buildKnowledgePrompt, palaceLabel } from '@/lib/ai/prompts';
import { openAiSettings } from '@/lib/ai/settings';
import { ALL_STARS, ALL_TOPICS, STAR_BRIEF_SEO, STAR_TO_SLUG } from '@/lib/seo/knowledge';
import { TOPIC_LABEL, TOPIC_PALACE_NAME, type TopicKey } from '@/lib/ziwei/db-analysis';


function AnswerText({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        const h = line.match(/^\*\*【(.+?)】\*\*$/);
        if (h) {
          return (
            <h2 key={i} style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ac)', letterSpacing: '0.12em', margin: '22px 0 8px' }}>
              【{h[1]}】
            </h2>
          );
        }
        if (!line.trim()) return null;
        const parts = line.split(/\*\*(.+?)\*\*/);
        return (
          <p key={i} style={{ fontSize: '15px', lineHeight: 1.9, color: 'var(--tx-1)', margin: '0 0 8px' }}>
            {parts.map((part, j) => (j % 2 ? <strong key={j} style={{ color: 'var(--tx-0)' }}>{part}</strong> : part))}
          </p>
        );
      })}
      {streaming && <span className="inline-block w-1.5 h-4 animate-pulse rounded-sm align-middle" style={{ background: 'var(--ac)', opacity: 0.6 }} />}
    </div>
  );
}

export default function KnowledgeAsk({ star, topic }: { star: string; topic: TopicKey }) {
  const palace = TOPIC_PALACE_NAME[topic];
  const topicLabel = TOPIC_LABEL[topic];
  const brief = STAR_BRIEF_SEO[star] ?? '';

  const provider = useAiProvider();
  const who = provider?.kind === 'claude' ? 'Claude' : 'AI';
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'thinking' | 'writing' | 'done'>('idle');
  const [error, setError] = useState('');
  const [setup, setSetup] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => () => ctl.current?.abort(), []);

  // 换专题时清空
  useEffect(() => {
    ctl.current?.abort();
    setAnswer(''); setStatus('idle'); setError('');
  }, [star, topic]);

  const ask = async () => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setAnswer(''); setError(''); setSetup(false); setStatus('thinking');
    try {
      const text = await askAI(buildKnowledgePrompt(star, palace, topicLabel, brief), {
        signal: c.signal,
        cacheHours: 24,
        onText: t => { setAnswer(t); setStatus('writing'); },
      });
      setAnswer(text);
      setStatus('done');
    } catch (e) {
      const partial = (e as { text?: string })?.text ?? '';
      setAnswer(partial);
      if ((e as { code?: string })?.code === 'cancelled') { setStatus(partial ? 'done' : 'idle'); return; }
      setError(errorCopy(e));
      setSetup(needsSettings(e));
      setStatus('idle');
    }
  };

  const chip = {
    fontSize: '12px', padding: '5px 12px', borderRadius: '999px', textDecoration: 'none',
    border: '1px solid rgba(184,146,42,0.18)', background: 'rgba(184,146,42,0.05)', color: 'var(--tx-2)',
  } as const;
  const chipOn = { ...chip, color: 'var(--ac)', border: '1px solid var(--ac)', background: 'rgba(184,146,42,0.12)' };

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <div className="px-6 py-4 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid rgba(184,146,42,0.15)', background: 'var(--bg-page)' }}>
        <Link href="/knowledge" style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.2em', textDecoration: 'none' }}>
          ← 知识库
        </Link>
        <div style={{ fontSize: '12px', color: 'var(--tx-3)', letterSpacing: '0.15em' }} className="truncate">
          {star}入{palaceLabel(palace)}
        </div>
        <Link href="/chart" style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.2em', textDecoration: 'none' }}>
          排盘 →
        </Link>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div style={{ fontSize: '11px', color: 'var(--tx-3)', letterSpacing: '0.3em', marginBottom: '10px' }}>
            {topicLabel} · {palaceLabel(palace)}
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, color: 'var(--tx-0)', letterSpacing: '0.15em', marginBottom: '14px' }}>
            {star}星入{palaceLabel(palace)}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--tx-2)', lineHeight: 1.8, maxWidth: '560px', margin: '0 auto' }}>{brief}</p>
        </div>

        <section style={{
          background: 'var(--bg-card)', border: '1px solid rgba(184,146,42,0.2)', borderRadius: '14px',
          padding: 'clamp(18px, 4vw, 32px)', minHeight: '180px',
        }}>
          {status === 'idle' && !answer && (
            <div className="flex flex-col items-center text-center gap-4 py-6">
              <p style={{ fontSize: '14px', color: 'var(--tx-2)', lineHeight: 1.8, maxWidth: '460px' }}>
                请 {who} 依倪海厦体系讲解「{star}入{palaceLabel(palace)}」：一句话定调、核心论断、亮度与四化、常见组合。
              </p>
              <button
                type="button"
                onClick={provider === null ? openAiSettings : ask}
                disabled={provider === undefined}
                className="px-8 py-3 rounded-full font-semibold tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--ac)', color: '#fff', fontSize: '14px' }}>
                {provider === null ? '先设定模型' : `请 ${who} 讲解`}
              </button>
              {provider === null && (
                <p style={{ fontSize: '12px', color: 'var(--tx-3)', lineHeight: 1.7, maxWidth: '420px' }}>{NO_PROVIDER_COPY}</p>
              )}
              {provider?.kind === 'openai' && (
                <button type="button" onClick={openAiSettings} style={{ fontSize: '12px', color: 'var(--tx-3)' }}>
                  模型：{provider.model} · 变更
                </button>
              )}
            </div>
          )}
          {status === 'thinking' && (
            <div className="flex items-center justify-between gap-4 py-6">
              <span className="animate-pulse" style={{ fontSize: '14px', color: 'var(--tx-2)' }}>{who} 正在整理讲解，约需半分钟…</span>
              <button type="button" onClick={() => ctl.current?.abort()} style={{ ...chip, cursor: 'pointer' }}>停止</button>
            </div>
          )}
          {answer && <AnswerText text={answer} streaming={status === 'writing'} />}
          {status === 'writing' && (
            <div className="flex justify-end mt-2">
              <button type="button" onClick={() => ctl.current?.abort()} style={{ ...chip, cursor: 'pointer' }}>停止</button>
            </div>
          )}
          {error && <p style={{ fontSize: '13px', color: 'var(--ji)', marginTop: '12px', lineHeight: 1.7 }}>{error}</p>}
          {setup && (
            <button type="button" className="ai-settings-link" style={{ marginTop: '10px' }} onClick={openAiSettings}>模型设定</button>
          )}
          {status === 'done' && (
            <p style={{ fontSize: '11px', color: 'var(--tx-3)', marginTop: '18px', lineHeight: 1.7 }}>
              以上由 AI 即时生成，仅供学习参考；实际论断须看全盘与三方四正。
            </p>
          )}
        </section>

        <div className="mt-12">
          <div style={{ fontSize: '11px', color: 'var(--tx-3)', letterSpacing: '0.3em', marginBottom: '12px' }}>{star}星在其他宫位</div>
          <div className="flex flex-wrap gap-2">
            {ALL_TOPICS.map(t => (
              <Link key={t} href={`/knowledge/${STAR_TO_SLUG[star]}/${t}`} style={t === topic ? chipOn : chip}>
                {TOPIC_LABEL[t]}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <div style={{ fontSize: '11px', color: 'var(--tx-3)', letterSpacing: '0.3em', marginBottom: '12px' }}>其他主星入{palaceLabel(palace)}</div>
          <div className="flex flex-wrap gap-2">
            {ALL_STARS.map(s => (
              <Link key={s} href={`/knowledge/${STAR_TO_SLUG[s]}/${topic}`} style={s === star ? chipOn : chip}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
