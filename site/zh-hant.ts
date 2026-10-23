/**
 * 繁体显示层：程式与资料维持简体（排盘引擎、iztro、古籍资料都用简体比对），
 * 只在画面上把文字转成繁体（台湾字形）。
 *
 * OpenCC 的通用词库会把几个紫微术语转错，这里按上下文改回：
 *   丑→醜（地支「丑」）、干→幹（宫干、生年干）、斗→鬥（斗君、七杀朝斗）、
 *   冲→衝（命理的「相冲」应作「沖」）、台→臺（三台、台辅，台湾惯用「台」）。
 */
import * as OpenCCHant from 'opencc-js/cn2t';
import * as OpenCCHans from 'opencc-js/t2cn';

const s2t = OpenCCHant.Converter({ from: 'cn', to: 'tw' });
const t2s = OpenCCHans.Converter({ from: 'tw', to: 'cn' });

interface Fix {
  /** OpenCC 转出的字 */
  wrong: string;
  /** 改回的字 */
  right: string;
  /** 这些情况下 OpenCC 是对的，保留 */
  keepAfter: string[];
  keepBefore: string[];
}

const FIXES: Record<string, Fix> = {
  '丑': { wrong: '醜', right: '丑', keepAfter: ['陋', '恶', '闻', '态', '化', '事', '八怪'], keepBefore: ['出', '美', '献', '家', '扮'] },
  '干': {
    wrong: '幹', right: '干',
    keepAfter: ['部', '活', '劲', '练', '线', '道', '将', '吗', '嘛', '什么', '啥', '掉'],
    keepBefore: ['能', '才', '主', '骨', '树', '躯', '枝', '实', '苦', '精', '蛮', '硬', '巧', '肯', '埋头', '单'],
  },
  '斗': {
    wrong: '鬥', right: '斗',
    keepAfter: ['争', '殴', '志', '士', '智', '嘴', '气', '牛', '鸡', '法', '狠', '勇', '艳', '胆'],
    keepBefore: ['战', '奋', '争', '决', '搏', '打', '械', '内', '缠', '好', '格', '暗', '恶', '比'],
  },
  '冲': {
    wrong: '衝', right: '沖',
    keepAfter: ['突', '动', '击', '锋', '刺', '浪', '撞', '劲', '破', '天', '冠', '闯', '力', '量', '程'],
    keepBefore: ['缓', '折', '俯', '直', '首当其', '要', '横'],
  },
};

const CJK = /[㐀-鿿]/;
const cache = new Map<string, string>();

export function toHant(src: string): string {
  if (!CJK.test(src)) return src;
  const hit = cache.get(src);
  if (hit !== undefined) return hit;

  let out = s2t(src);
  // cn→tw 是逐字对应（长度不变），才能按位置比对原文上下文
  if (out.length === src.length) {
    const chars = out.split('');
    for (let i = 0; i < src.length; i++) {
      const fix = FIXES[src[i]];
      if (!fix || chars[i] !== fix.wrong) continue;
      const after = src.slice(i + 1, i + 4);
      const before = src.slice(Math.max(0, i - 3), i);
      const keep = fix.keepAfter.some(w => after.startsWith(w)) || fix.keepBefore.some(w => before.endsWith(w));
      if (!keep) chars[i] = fix.right;
    }
    out = chars.join('');
  }
  out = out.replace(/臺/g, '台');

  if (cache.size > 8000) cache.clear();
  cache.set(src, out);
  return out;
}

/** 读者输入的繁体（如搜索词）转回简体，才能对上简体资料 */
export function toSimplified(s: string): string {
  return CJK.test(s) ? t2s(s) : s;
}

// ─── 画面转换 ─────────────────────────────────────────────

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
/** 记录每个节点最后一次转好的值，避免自己的修改又触发一轮转换 */
const done = new WeakMap<Node, string>();

function skip(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName) || e.hasAttribute('data-no-hant') || (e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function convertText(node: Text) {
  const v = node.nodeValue;
  if (!v || done.get(node) === v || !CJK.test(v) || skip(node.parentElement)) return;
  const t = toHant(v);
  done.set(node, t);
  if (t !== v) node.nodeValue = t;
}

function convertAttr(el: Element, name: string) {
  const v = el.getAttribute(name);
  if (!v || !CJK.test(v)) return;
  const t = toHant(v);
  if (t !== v) el.setAttribute(name, t);
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { convertText(root as Text); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (skip(root as Element)) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n: Node | null = tw.currentNode; n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) convertText(n as Text);
    else for (const a of ATTRS) if ((n as Element).hasAttribute(a)) convertAttr(n as Element, a);
  }
}

/** 开始监看整份文件：之后 React 写进画面的文字都会即时转成繁体（在浏览器绘制前） */
export function installHant() {
  walk(document.documentElement);
  new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'characterData') convertText(r.target as Text);
      else if (r.type === 'attributes') convertAttr(r.target as Element, r.attributeName!);
      else r.addedNodes.forEach(walk);
    }
  }).observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS,
  });
  // 画在 canvas 上的字（分享卡）不经过 DOM，一并转换
  const fillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text: string, ...rest: [number, number, number?]) {
    return fillText.call(this, toHant(String(text)), ...rest);
  };
}
