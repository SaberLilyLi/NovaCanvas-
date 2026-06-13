import { getBizConfig } from '@novacanvas/biz-config';
import type { BizType, ConversationMessage } from '@novacanvas/types';

const businessGuidance: Record<BizType, string> = {
  general: '保持构图明确、主体可信、视觉完成度高，避免无意义文字与水印。',
  used_car:
    '车辆品牌特征、车身比例、轮毂、车灯和玻璃结构必须真实一致；强调漆面材质、销售可信度和营销构图，不虚构车牌文字。',
  fashion:
    '准确保留服装版型、领型、袖型、面料纹理和关键装饰；强调穿搭逻辑、材质触感、人物姿态与编辑摄影质感。',
  ecommerce: '准确保留商品结构与材质，背景干净，光线服务于商品卖点。',
  poster: '预留合理文案空间，构图具有传播力，不生成乱码文字。',
};

export interface BuildPromptInput {
  bizType: BizType;
  sceneType?: string;
  userPrompt: string;
  referenceImageCount?: number;
  history?: ConversationMessage[];
}

const chineseCountMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 两: 2 };

/** 从用户输入解析期望张数，如「生成四张」「3张」 */
export function parseImageCountFromPrompt(prompt: string): number | undefined {
  const digitMatch = prompt.match(/(\d+)\s*张/);
  if (digitMatch) {
    const value = Number(digitMatch[1]);
    if (value >= 1 && value <= 4) return value;
  }
  const cnMatch = prompt.match(/([一二三四两])\s*张/);
  if (cnMatch?.[1]) return chineseCountMap[cnMatch[1]];
  return undefined;
}

/** 多图并行时，将 batch 语义改写为单图 prompt，避免模型输出拼图 */
export function sanitizeSingleImagePrompt(
  userPrompt: string,
  taskIndex: number,
  totalCount: number,
): string {
  let cleaned = userPrompt.trim();
  cleaned = cleaned
    .replace(/生成\s*[一二三四两\d]+\s*张/g, '生成一张')
    .replace(/画\s*[一二三四两\d]+\s*张/g, '画一张')
    .replace(/来\s*[一二三四两\d]+\s*张/g, '来一张')
    .replace(/多张|若干张|一组/g, '一张');

  if (totalCount > 1) {
    cleaned = `${cleaned}（共 ${totalCount} 张系列之第 ${taskIndex} 张：独立单张完整画面，禁止多宫格、拼图、分镜合集）`;
  }
  return cleaned;
}

const META_USER_PROMPTS = new Set(['重新生成', '重新编辑']);

export function isMetaUserPrompt(content: string): boolean {
  return META_USER_PROMPTS.has(content.trim());
}

export function resolveLastUserPrompt(messages: ConversationMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const content = message?.content?.trim();
    if (message?.role === 'user' && content && !isMetaUserPrompt(content)) {
      return content;
    }
  }
  return undefined;
}

export const DEEPSEEK_REGENERATE_SYSTEM_PROMPT = `你是 NovaCanvas AI 的图片创作助手。
用户点击了「重新生成」，你需要基于用户上一句真实需求，输出严格 JSON（不要 Markdown，不要解释）。

## 任务
1. variedPrompt：生成 1 条用于文生图的中文提示词，保留用户核心意图，但在主体细节、风格、构图、光线或背景上做出明显随机变化，确保与上次结果不同。
2. suggestions：生成 3 条改写建议，供用户点击继续创作。每条包含 title（8-18 字简短标题，描述改动方向）与 prompt（40-120 字完整可执行中文文生图提示词，保留用户核心主体并在姿态、场景、构图、光线或风格上做明确改写，结尾含「无文字、无水印、无Logo、无边框」）。

## 返回结构
{
  "variedPrompt": "单张图中文提示词",
  "suggestions": [
    { "title": "标题1", "prompt": "完整提示词1" },
    { "title": "标题2", "prompt": "完整提示词2" },
    { "title": "标题3", "prompt": "完整提示词3" }
  ]
}`;

export const DEEPSEEK_PROMPT_SUGGESTIONS_SYSTEM_PROMPT = `你是 NovaCanvas AI 的图片创作助手。
用户刚完成一轮图片生成，你需要基于用户上一句真实需求，输出严格 JSON（不要 Markdown，不要解释）。

## 任务
生成 3 条改写建议，每条包含：
1. title：简短中文标题，8-18 字，展示在按钮上，描述改动方向，如「换成蹲在屋顶看日落的姿态」
2. prompt：完整可执行的中文文生图提示词，40-120 字，保留用户核心主体，在姿态、场景、构图、光线、风格等某一维度做出明确改写；需包含画面细节、镜头、色调、质感要求；结尾加上「无文字、无水印、无Logo、无边框」

## 返回结构
{
  "suggestions": [
    { "title": "标题1", "prompt": "完整提示词1" },
    { "title": "标题2", "prompt": "完整提示词2" },
    { "title": "标题3", "prompt": "完整提示词3" }
  ]
}`;

export function buildImagePrompt(input: BuildPromptInput): string {
  const config = getBizConfig(input.bizType);
  const scene = config.supportedSceneTypes.find((item) => item.value === input.sceneType);
  const historyHint = input.history?.slice(-3).map((message) => message.content).join('；');
  const parts = [
    `业务场景：${config.title}`,
    scene ? `创作类型：${scene.label}。${scene.description}` : undefined,
    `用户要求：${input.userPrompt.trim()}`,
    input.referenceImageCount
      ? `参考图：共 ${input.referenceImageCount} 张，保持主体身份与关键结构一致。`
      : undefined,
    historyHint ? `最近上下文：${historyHint}` : undefined,
    `质量要求：${businessGuidance[input.bizType]}`,
    '输出要求：专业商业摄影质量，细节清晰，光影自然，画面无水印、无边框、无乱码。',
  ];

  return parts.filter(Boolean).join('\n');
}

export const DEEPSEEK_PLANNER_SYSTEM_PROMPT = `你是 NovaCanvas AI 的图片任务规划器。
你只返回严格 JSON，不使用 Markdown，不解释，不输出自然语言。
根据 bizType、sceneType、当前输入、上传图 imageIds、selectedImageId、latestImageId、latestResultGroupId、resultGroupImages、最近消息判断任务。

## 意图规则
1. 「重新生成」：默认复用上一轮用户 prompt 重新生成；若用户指定某张图（如「第二张重新生成」），则基于该图 imageId 重新生成。
2. 「继续修改 / 继续调整 / 把它 / 这张 / 修改 / 调整 / 换成 / 改成 / 重新编辑」：必须使用 selectedImageId（优先）或 latestImageId 作为 inputImageIds，taskType 必须是 image_to_image 或 text_image_to_image。
3. 「第一张 / 第二张 / 第三张 / 第四张」：必须映射到 latestResultGroupId 对应 resultGroupImages 中 imageIndex 匹配的 imageId。
4. 若任务依赖上一张图片，taskType 必须是 image_to_image 或 text_image_to_image，且 tasks[].inputImageIds 不能为空。
5. 只有用户明确要求生成全新图片（如「全新」「重新画一张」「不要参考」）且本轮无上传图、无编辑语义时，才允许 text_to_image。
6. 独立多图任务使用 generationMode=parallel；后续任务依赖前一结果时使用 serial 并填写 dependsOnIndex。
7. imageCount 为实际生成张数（1-4）。
8. imageCount 为 N 时，tasks 数组必须包含 N 个独立任务，每个任务只生成 1 张图；禁止把 N 张图合并到 1 个 task 或 1 张拼图。
9. 多图并行时，每个 task 的 prompt 必须按「单张图」描述，不得保留「四张」「多宫格」等 batch 语义。

## 返回结构（严格 JSON）
{
  "taskType": "text_to_image|image_to_image|text_image_to_image|image_chat|unknown",
  "imageCount": 1,
  "generationMode": "parallel|serial",
  "useHistoryImage": false,
  "useUploadedImages": false,
  "needGenerate": true,
  "tasks": [
    { "index": 1, "prompt": "单张图中文提示词", "inputImageIds": [], "size": "1024x1024" },
    { "index": 2, "prompt": "单张图中文提示词", "inputImageIds": [], "size": "1024x1024" }
  ]
}
注意：imageCount=2 时 tasks 必须有 2 项，每项对应 1 张独立图片。`;
