/**
 * Planner + generation context self-test for the 7 acceptance scenarios.
 * Run: node apps/server/scripts/planner-self-test.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const editReferencePattern =
  /(这张|上一张|继续|把它|基于它|再调整|修改|调整|换成|改成|重新编辑)/;
const regeneratePattern = /重新生成/;
const ordinalPattern = /第\s*([一二三四1-4])\s*张/;
const chineseOrdinals = { 一: 1, 二: 2, 三: 3, 四: 4 };

function resolveOrdinalImageId(prompt, resultGroupImages) {
  const match = prompt.match(ordinalPattern);
  if (!match?.[1]) return undefined;
  const index = chineseOrdinals[match[1]] ?? Number(match[1]);
  return resultGroupImages.find((image) => image.imageIndex === index)?.id;
}

function createDeterministicPlan(input) {
  const hasUploads = input.imageIds.length > 0;
  const hasOrdinal = ordinalPattern.test(input.prompt);
  const isRegenerate = regeneratePattern.test(input.prompt);
  const shouldUseHistory =
    !hasUploads &&
    Boolean(input.latestImageId || input.selectedImageId) &&
    (editReferencePattern.test(input.prompt) || isRegenerate || hasOrdinal);

  const ordinalId = hasOrdinal
    ? resolveOrdinalImageId(input.prompt, input.resultGroupImages ?? [])
    : undefined;
  const historyImageId = ordinalId ?? input.selectedImageId ?? input.latestImageId;
  const inputImageIds = hasUploads
    ? input.imageIds
    : shouldUseHistory && historyImageId
      ? [historyImageId]
      : [];

  const effectivePrompt = isRegenerate
    ? input.lastUserPrompt?.trim() || input.prompt
    : input.prompt;

  const taskType =
    inputImageIds.length === 0
      ? 'text_to_image'
      : effectivePrompt.trim()
        ? 'text_image_to_image'
        : 'image_to_image';
  const count = Math.max(1, Math.min(input.count, 4));

  return {
    taskType,
    imageCount: count,
    tasks: Array.from({ length: count }, (_, index) => ({
      index: index + 1,
      prompt: effectivePrompt,
      inputImageIds,
    })),
  };
}

let latestImageId;
let selectedImageId;
let latestResultGroupId;
let resultGroupImages = [];
let lastUserPrompt;

const results = [];

function run(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, pass: false, error: error.message });
    console.log(`✗ ${name}: ${error.message}`);
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// Scenario 1: 生成一只猫
run('1. 生成一只猫 → text_to_image, latestImageId 待更新', () => {
  const plan = createDeterministicPlan({
    prompt: '生成一只猫',
    imageIds: [],
    count: 1,
    latestImageId,
    selectedImageId,
    resultGroupImages,
    lastUserPrompt,
  });
  if (plan.taskType !== 'text_to_image') throw new Error(`expected text_to_image, got ${plan.taskType}`);
  if (plan.tasks[0].inputImageIds.length !== 0) throw new Error('should have no input images');
  lastUserPrompt = '生成一只猫';
  latestImageId = 'img_cat_001';
  latestResultGroupId = 'grp_001';
  resultGroupImages = [{ id: latestImageId, imageIndex: 1, resultGroupId: latestResultGroupId }];
});

// Scenario 2: 把它改成橘猫
run('2. 把它改成橘猫 → text_image_to_image + latestImageId', () => {
  const plan = createDeterministicPlan({
    prompt: '把它改成橘猫',
    imageIds: [],
    count: 1,
    latestImageId,
    selectedImageId,
    resultGroupImages,
    lastUserPrompt,
  });
  if (plan.taskType !== 'text_image_to_image') throw new Error(`expected text_image_to_image, got ${plan.taskType}`);
  if (plan.tasks[0].inputImageIds[0] !== latestImageId) throw new Error('must use latestImageId');
  lastUserPrompt = '把它改成橘猫';
  latestImageId = 'img_cat_002';
  resultGroupImages = [{ id: latestImageId, imageIndex: 1, resultGroupId: 'grp_002' }];
  latestResultGroupId = 'grp_002';
});

function sanitizeSingleImagePrompt(userPrompt, taskIndex, totalCount) {
  let cleaned = userPrompt.trim()
    .replace(/生成\s*[一二三四两\d]+\s*张/g, '生成一张')
    .replace(/画\s*[一二三四两\d]+\s*张/g, '画一张')
    .replace(/多张|若干张|一组/g, '一张');
  if (totalCount > 1) {
    cleaned = `${cleaned}（共 ${totalCount} 张系列之第 ${taskIndex} 张：独立单张完整画面，禁止多宫格、拼图、分镜合集）`;
  }
  return cleaned;
}

function expandPlan(plan, input, targetCount) {
  const userPromptBase = input.prompt.trim();
  const baseTask = plan.tasks[0] ?? { inputImageIds: [] };
  const tasks = Array.from({ length: targetCount }, (_, index) => {
    const source = plan.tasks[index] ?? plan.tasks[0] ?? baseTask;
    return {
      index: index + 1,
      prompt: sanitizeSingleImagePrompt(userPromptBase, index + 1, targetCount),
      inputImageIds: [...(source.inputImageIds ?? [])],
    };
  });
  return { ...plan, imageCount: targetCount, tasks };
}

// Scenario 3: 生成四张猫咪图片
run('3. 生成四张猫咪图片 → 4 tasks with imageIndex', () => {
  const rawPlan = createDeterministicPlan({
    prompt: '生成四张猫咪图片',
    imageIds: [],
    count: 4,
    latestImageId,
    selectedImageId,
    resultGroupImages,
    lastUserPrompt,
  });
  const plan = expandPlan(rawPlan, { prompt: '生成四张猫咪图片' }, 4);
  if (plan.imageCount !== 4) throw new Error(`expected 4 images, got ${plan.imageCount}`);
  if (plan.tasks.length !== 4) throw new Error('expected 4 tasks');
  if (plan.tasks.some((task) => /四张|多宫格/.test(task.prompt) && !task.prompt.includes('禁止多宫格'))) {
    throw new Error('task prompt must be sanitized to single-image semantics');
  }
  lastUserPrompt = '生成四张猫咪图片';
  latestResultGroupId = 'grp_003';
  resultGroupImages = [1, 2, 3, 4].map((index) => ({
    id: `img_cat_multi_${index}`,
    imageIndex: index,
    resultGroupId: latestResultGroupId,
  }));
  latestImageId = 'img_cat_multi_4';
});

// Scenario 4: 把第二张改成白色猫
run('4. 把第二张改成白色猫 → 使用第2张 imageId', () => {
  const plan = createDeterministicPlan({
    prompt: '把第二张改成白色猫',
    imageIds: [],
    count: 1,
    latestImageId,
    selectedImageId,
    resultGroupImages,
    lastUserPrompt,
  });
  const secondId = resultGroupImages.find((i) => i.imageIndex === 2)?.id;
  if (!secondId) throw new Error('missing second image in result group');
  if (plan.tasks[0].inputImageIds[0] !== secondId) {
    throw new Error(`expected ${secondId}, got ${plan.tasks[0].inputImageIds[0]}`);
  }
  if (plan.taskType !== 'text_image_to_image') throw new Error('expected text_image_to_image');
  selectedImageId = secondId;
  lastUserPrompt = '把第二张改成白色猫';
  latestImageId = 'img_cat_white_2';
});

// Scenario 5: 重新生成
run('5. 重新生成 → 基于上一轮 prompt + selectedImageId', () => {
  const plan = createDeterministicPlan({
    prompt: '重新生成',
    imageIds: [],
    count: 1,
    latestImageId,
    selectedImageId,
    resultGroupImages,
    lastUserPrompt,
  });
  if (plan.tasks[0].inputImageIds[0] !== selectedImageId) {
    throw new Error('regenerate must use selectedImageId');
  }
  if (!plan.tasks[0].prompt.includes('把第二张改成白色猫')) {
    throw new Error('regenerate must reuse last user prompt');
  }
});

// Scenario 6: ComposerInput 单实例（静态检查）
run('6. ComposerInput 只在 ImageComposerPage 根级渲染一次', () => {
  const pageSource = fs.readFileSync(
    path.join(root, 'packages/react/src/image-composer-page.tsx'),
    'utf8',
  );
  const messageListSource = fs.readFileSync(
    path.join(root, 'packages/react/src/message-list.tsx'),
    'utf8',
  );
  const composerInputCount = (pageSource.match(/<ComposerInput/g) ?? []).length;
  if (composerInputCount !== 1) throw new Error(`expected 1 ComposerInput, found ${composerInputCount}`);
  if (messageListSource.includes('ComposerInput')) throw new Error('MessageList must not render ComposerInput');
});

// Scenario 7: 多图标题显示实际数量
run('7. 多图结果标题显示实际张数', () => {
  const messageListSource = fs.readFileSync(
    path.join(root, 'packages/react/src/message-list.tsx'),
    'utf8',
  );
  if (!messageListSource.includes('{item.images.length} 张')) {
    throw new Error('MessageList must display item.images.length');
  }
});

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} scenarios passed`);
if (passed !== results.length) process.exit(1);
