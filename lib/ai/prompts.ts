/**
 * 浏览器端可用的提示词（不依赖 patterns.ts）。命盘相关的提示词在 chart-prompts.ts。
 */

/** iztro 宫名：命宫带「宫」字，其余不带；统一成带「宫」字 */
export function palaceLabel(name: string): string {
  return name.endsWith('宫') ? name : `${name}宫`;
}

export const STYLE_RULES = `写作规则：
1. 一律使用繁体中文（台湾用语）。
2. 只根据上面提供的盘面资料论断，不要虚构盘上没有的星曜、四化或宫位。
3. 依倪海厦《天纪》紫微斗数体系的思路解读；提到倪师观点时用转述（如「倪师认为……」），不要编造逐字引文、集数或时间码。
4. 段落标题单独一行，写成 **【标题】** 的格式；重点词句用 **粗体**；不要使用 # 标题、表格或程式码区块。
5. 语气中肯、具体，少用绝对化的预言；涉及健康只谈保养方向，并提醒身体不适应就医。
6. 篇幅约 600–900 字，除非使用者另有要求。`;

/** 知识库：某主星在某宫位 */
export function buildKnowledgePrompt(star: string, palaceName: string, topicLabel: string, brief: string): string {
  return `你是一位紫微斗数老师，请为初学者讲解「${star}星入${palaceLabel(palaceName)}」（主题：${topicLabel}）。

${star}星简介：${brief}

请按以下结构输出：
**【一句话定调】**
这个组合最核心的特质。

**【核心论断】**
${star}星在${palaceLabel(palaceName)}的表现，包含优点与需要注意的地方。

**【亮度与四化】**
庙旺与落陷时的差别，以及${star}星化禄、化权、化科、化忌（只谈实际会发生的四化）时的变化。

**【常见组合】**
与同宫或三方四正常见星曜的搭配。

**【古籍与倪师观点】**
《紫微斗数全书》、《骨髓赋》或倪师的相关看法，用转述，不要编造原文。

${STYLE_RULES.replace('篇幅约 600–900 字', '篇幅约 500–800 字')}`;
}
