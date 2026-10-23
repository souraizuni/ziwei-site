import { SITE_NAME } from '@/lib/site';

export const metadata = { title: `隐私说明 · ${SITE_NAME}`, description: `${SITE_NAME}如何处理你的出生资料` };

const h2 = { fontSize: 18, marginTop: 32, marginBottom: 12 } as const;

export default function PrivacyPage() {
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
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>隐私说明</h1>
        <p style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 32 }}>最后更新：2026 年 10 月</p>

        <h2 style={h2}>1. 排盘在你的浏览器里完成</h2>
        <p>你填写的姓名（选填）、出生日期时间、性别与出生地，只在你的浏览器里计算命盘，不会传到本站的伺服器——本站没有伺服器端，也没有帐号系统。</p>

        <h2 style={h2}>2. 存在你浏览器里的资料</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>明暗主题</strong>：记住你选的亮色或暗色。</li>
          <li><strong>最近排过的命盘</strong>：最多 10 笔，方便下次带入表单；可在排盘页逐笔删除，或清除浏览器的网站资料。</li>
          <li><strong>模型设定</strong>：你填的端点、API 金钥与模型名称。</li>
        </ul>
        <p>这些资料只在你这台装置、这个浏览器里，其他人看不到，本站也读不到。</p>

        <h2 style={h2}>3. 使用 AI 解读时</h2>
        <p>当你按下解读、合盘分析或百科讲解，命盘内容（含出生资料与你的提问）才会送出，去向依你打开本站的地方而定：</p>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>一般网址（例如 GitHub Pages）</strong>：直接从你的浏览器送到你在「模型设定」填的端点，不经过本站。你的 API 金钥只存在这个浏览器，资料处理适用该服务商的隐私政策。用完公用电脑请在「模型设定」按「清除设定」。</li>
          <li><strong>claude.ai</strong>：送到 Anthropic 的 Claude，使用你自己的 Claude 帐号，第一次会跳出视窗征求同意，适用 Anthropic 的隐私政策。</li>
        </ul>
        <p>不按这些按钮，就不会送出任何资料。</p>

        <h2 style={h2}>4. 其他</h2>
        <p>本站不使用广告追踪，也不出售或分享你的资料。若本说明有变更，会更新本页日期。</p>

        <p style={{ marginTop: 48, fontSize: 12, color: 'var(--tx-3)' }}>
          <a href="/terms" style={{ color: 'var(--ac)' }}>使用条款</a> · <a href="/" style={{ color: 'var(--ac)' }}>返回首页</a>
        </p>
      </main>
    </>
  );
}
