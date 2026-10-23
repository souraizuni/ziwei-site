import { SITE_NAME } from '@/lib/site';

export const metadata = { title: `使用条款 · ${SITE_NAME}`, description: `${SITE_NAME}使用条款` };

const h2 = { fontSize: 18, marginTop: 32, marginBottom: 12 } as const;

export default function TermsPage() {
  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-0)', borderBottom: '1px solid var(--bdr)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--tx-3)', textDecoration: 'none' }}>
          <span style={{ fontSize: '16px' }}>‹</span>
          <span>返回首页</span>
        </a>
        <div style={{ width: '1px', height: '20px', background: 'var(--bdr-med)' }} />
        <span style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.2em' }}>{SITE_NAME}</span>
      </header>
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 80px', color: 'var(--tx-1)', lineHeight: 1.8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>使用条款</h1>
        <p style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 32 }}>最后更新：2026 年 10 月</p>

        <h2 style={h2}>1. 内容性质</h2>
        <p>{SITE_NAME}依倪海厦《天纪》紫微斗数体系提供排盘与解读，属于传统文化的学习与参考，<strong>不构成医疗、投资、法律或任何重大决策的建议</strong>。身体不适请就医，重要决定请咨询相关专业人士。</p>

        <h2 style={h2}>2. AI 解读</h2>
        <p>解读、合盘分析与百科讲解由 AI 即时生成，可能有错误或前后不一致，请以命盘本身与古籍原典为准。在一般网址上使用的是你在「模型设定」填的服务商与模型，费用由你的 API 帐号支付，并适用该服务商的条款；在 claude.ai 上打开时使用 Claude，费用计入你自己的 Claude 帐号，并适用 Anthropic 的使用条款。</p>

        <h2 style={h2}>3. 六亲判断</h2>
        <p>倪师在《天纪》中提到，斗数论六亲本来就比较弱。父母、兄弟、子女相关的分析请只当参考。</p>

        <h2 style={h2}>4. 来源与授权</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li>排盘引擎、介面程式：<a href="https://github.com/Renhuai123/ziwei-doushu" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ac)' }}>Renhuai123/ziwei-doushu</a>，MIT 授权。</li>
          <li>《紫微斗数全书》《紫微斗数全集》《骨髓赋》等古籍原文属公有领域。</li>
        </ul>

        <h2 style={h2}>5. 未成年人</h2>
        <p>未成年人请在监护人陪同下使用，且不要以解读结果做重大人生决定。</p>

        <p style={{ marginTop: 48, fontSize: 12, color: 'var(--tx-3)' }}>
          <a href="/privacy" style={{ color: 'var(--ac)' }}>隐私说明</a> · <a href="/" style={{ color: 'var(--ac)' }}>返回首页</a>
        </p>
      </main>
    </>
  );
}
