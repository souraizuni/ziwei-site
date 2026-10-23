/**
 * 单盘解读 / 合盘的提示词：先把命盘整理成给 AI 读的纯文本。
 *
 * 只描述盘面事实（宫位、星曜、亮度、四化、大限、格局），不带任何断语，
 * 解读交给 AI 按倪师体系去做；这样 AI 不会把「盘上没有的星」说成有。
 *
 * 用到 patterns.ts（标了 server-only），所以只给单页版的 site/api-bridge.ts 用；
 * 浏览器元件请用 lib/ai/client.ts 与 prompts.ts。
 */
import { STEMS, BRANCHES, SHICHEN } from '@/lib/ziwei/constants';
import { detectPatterns } from '@/lib/ziwei/patterns';
import { getLiuNianSiHua } from '@/lib/ziwei/sihua';
import { HEMING_METHODOLOGY } from '@/lib/ziwei/heming-knowledge';
import type { Palace, Star, ZiweiChart } from '@/lib/ziwei/types';
import { palaceLabel, STYLE_RULES } from './prompts';
import type { ChatTurn } from './openai';


function starLabel(s: Star): string {
  let t = s.name;
  if (s.brightnessRaw) t += `(${s.brightnessRaw})`;
  if (s.siHua) t += `[生年化${s.siHua}]`;
  return t;
}

function palaceLine(chart: ZiweiChart, p: Palace): string {
  const major = p.stars.filter(s => s.type === 'major');
  const others = p.stars.filter(s => s.type !== 'major');
  const tags: string[] = [];
  if (p.branch === chart.mingGongBranch) tags.push('命宫');
  if (p.branch === chart.shenGongBranch) tags.push('身宫');
  if (p.isCurrentDaXian) tags.push('当前大限');

  const parts = [
    `${palaceLabel(p.name)}（${STEMS[p.stem] ?? ''}${BRANCHES[p.branch] ?? ''}）${tags.length ? `〔${tags.join('、')}〕` : ''}`,
    major.length
      ? `主星：${major.map(starLabel).join('、')}`
      : `主星：空宫，借对宫${p.borrowedFromName ? palaceLabel(p.borrowedFromName) : ''}${p.borrowedStars?.length ? `的${p.borrowedStars.join('、')}` : ''}`,
  ];
  if (others.length) parts.push(`辅星杂曜：${others.map(starLabel).join('、')}`);
  if (p.selfSihua?.length) parts.push(`宫干自化：${p.selfSihua.map(x => `${x.starName}自化${x.siHua}`).join('、')}`);
  if (p.daXianAge) parts.push(`大限 ${p.daXianAge[0]}–${p.daXianAge[1]} 岁`);
  return '- ' + parts.join('；');
}

/** 命盘全文描述（约 1–2 千字） */
export function chartToText(chart: ZiweiChart, label = '命主'): string {
  const b = chart.birthInfo;
  const l = chart.lunarInfo;
  const shichen = SHICHEN[b.hour]?.name ?? '';
  const yearGz = `${STEMS[l.yearStem] ?? ''}${BRANCHES[l.yearBranch] ?? ''}`;
  const thisYear = new Date().getFullYear();
  const liunian = getLiuNianSiHua(thisYear);
  const daxian = chart.daXians[chart.currentDaXianIndex];

  const lines: string[] = [];
  lines.push(`【${label}基本资料】`);
  lines.push(`- 性别：${b.gender === 'male' ? '男' : '女'}${chart.yinYangGender ? `（${chart.yinYangGender}）` : ''}`);
  lines.push(`- 公历：${b.year} 年 ${b.month} 月 ${b.day} 日 ${shichen}`);
  lines.push(`- 农历：${yearGz}年 ${l.isLeapMonth ? '闰' : ''}${Math.abs(l.lunarMonth)} 月 ${l.lunarDay} 日`);
  if (l.fourPillars) lines.push(`- 四柱：${l.fourPillars.join(' ')}`);
  lines.push(`- 五行局：${chart.wuxingJuName}`);
  if (chart.mingZhu || chart.shenZhu) lines.push(`- 命主：${chart.mingZhu ?? '—'}；身主：${chart.shenZhu ?? '—'}`);
  lines.push(`- 虚岁：${chart.currentAge}（以 ${thisYear} 年计）`);
  if (daxian) {
    const dxSihua = daxian.siHua
      ? `；大限四化：${daxian.siHua.lu}化禄、${daxian.siHua.quan}化权、${daxian.siHua.ke}化科、${daxian.siHua.ji}化忌`
      : '';
    lines.push(`- 当前大限：${daxian.startAge}–${daxian.endAge} 岁，走${palaceLabel(daxian.palaceName)}${daxian.stemName ? `（${daxian.stemName}干）` : ''}${dxSihua}`);
  }
  const t = liunian.transforms;
  lines.push(`- ${thisYear} 流年（${liunian.stemName}干）四化：${t['禄']}化禄、${t['权']}化权、${t['科']}化科、${t['忌']}化忌`);

  lines.push('');
  lines.push('【十二宫】（亮度：庙旺得利平不陷；[生年化X] 为生年四化）');
  // 从命宫起，按宫序（地支逆行）列出
  const ordered = [...chart.palaces].sort((a, b2) =>
    ((chart.mingGongBranch - a.branch + 12) % 12) - ((chart.mingGongBranch - b2.branch + 12) % 12));
  for (const p of ordered) lines.push(palaceLine(chart, p));

  const patterns = detectPatterns(chart);
  if (patterns.length) {
    lines.push('');
    lines.push('【引擎识别出的格局】');
    for (const pt of patterns.slice(0, 10)) {
      lines.push(`- ${pt.name}（${pt.level}）：${pt.description}`);
    }
  }
  return lines.join('\n');
}

// ─── 提示词 ────────────────────────────────────────────────

/** 单盘解读 / 追问：第一轮放规则与命盘，之后接上对话 */
export function buildInterpretInput(chart: ZiweiChart, messages: ChatTurn[]): ChatTurn[] {
  const intro = `你是一位紫微斗数命理师，熟悉倪海厦《天纪》体系与《紫微斗数全书》。以下是使用者的命盘（由排盘引擎计算，资料可信）：

${chartToText(chart)}

${STYLE_RULES}

接下来是使用者的问题。`;
  const turns: ChatTurn[] = [{ role: 'user', content: intro }];
  // 只保留最近 12 轮，避免越聊越长
  for (const m of messages.slice(-12)) {
    if (m.content.trim()) turns.push({ role: m.role, content: m.content });
  }
  if (turns[turns.length - 1].role !== 'user') turns.push({ role: 'user', content: '请继续。' });
  return turns;
}

/** 合盘分析 */
export function buildHemingInput(chartA: ZiweiChart, chartB: ZiweiChart, question?: string): string {
  const nameA = chartA.birthInfo.name || '甲方';
  const nameB = chartB.birthInfo.name || '乙方';
  return `你是一位紫微斗数命理师，请依下面的合盘方法论，比对两张命盘的契合度。

${HEMING_METHODOLOGY}

${chartToText(chartA, nameA)}

${chartToText(chartB, nameB)}

${STYLE_RULES}

${question
    ? `使用者特别想知道：${question}\n请先直接回答这个问题，再补充关键依据。`
    : `请按以下结构输出：
**【合盘总评】**
一句话定性两人的关系格局。

**【命宫互动】**
两人的个性如何相处。

**【夫妻宫与福德宫】**
依双宫联参原则分析感情深度与长久性。

**【四化交互】**
双方生年四化落入对方哪些宫位，带来什么影响。

**【相处建议】**
具体可行的建议。
`}`;
}
