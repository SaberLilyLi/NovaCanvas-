import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  buildImagePrompt,
  DEEPSEEK_PLANNER_SYSTEM_PROMPT,
  parseImageCountFromPrompt,
  sanitizeSingleImagePrompt,
} from '@novacanvas/prompt-presets';
import type {
  BizType,
  ConversationMessage,
  GenerationPlan,
  ImageSize,
  ResultGroupImage,
  TaskType,
} from '@novacanvas/types';

export interface PlannerInput {
  bizType: BizType;
  sceneType?: string;
  prompt: string;
  imageIds: string[];
  count: number;
  size: ImageSize;
  latestImageId?: string;
  selectedImageId?: string;
  latestResultGroupId?: string;
  resultGroupImages?: ResultGroupImage[];
  lastUserPrompt?: string;
  messages: ConversationMessage[];
  metadata?: Record<string, unknown>;
}

const editReferencePattern =
  /(这张|上一张|继续|把它|基于它|再调整|修改|调整|换成|改成|重新编辑|优化|细节修复|提升画质)/;
const regeneratePattern = /重新生成/;
const newImagePattern = /(全新|重新画|从零|不要参考|新画一张|生成一张新的)/;
const ordinalPattern = /第\s*([一二三四1-4])\s*张/;
const serialPattern = /(然后|接着|再基于|第二张基于|下一张继续)/;

const chineseOrdinals: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
};

@Injectable()
export class PlannerService {
  async createPlan(input: PlannerInput): Promise<GenerationPlan> {
    const plan =
      (process.env.NOVACANVAS_RUNTIME ?? 'mock') === 'live'
        ? await this.createLivePlan(input)
        : this.createDeterministicPlan(input);
    return this.normalizeAndValidatePlan(plan, input);
  }

  validatePlan(plan: GenerationPlan): void {
    if (!plan.needGenerate) return;
    for (const task of plan.tasks) {
      if (
        (plan.taskType === 'image_to_image' || plan.taskType === 'text_image_to_image') &&
        task.inputImageIds.length === 0
      ) {
        throw new BadRequestException(
          `taskType 为 ${plan.taskType} 时 tasks[${task.index}].inputImageIds 不能为空，不允许降级为 text_to_image`,
        );
      }
    }
  }

  private normalizeAndValidatePlan(plan: GenerationPlan, input: PlannerInput): GenerationPlan {
    const normalized: GenerationPlan = {
      ...plan,
      imageCount: Math.max(1, Math.min(plan.imageCount || plan.tasks.length || 1, 4)),
      tasks: plan.tasks.map((task, index) => ({
        ...task,
        index: task.index ?? index + 1,
        inputImageIds: [...(task.inputImageIds ?? [])],
        size: task.size ?? input.size,
      })),
    };

    if (!normalized.needGenerate) {
      this.validatePlan(normalized);
      return normalized;
    }

    const hasUploads = input.imageIds.length > 0;
    const hasEditIntent =
      !hasUploads &&
      (editReferencePattern.test(input.prompt) || regeneratePattern.test(input.prompt));
    const hasOrdinal = ordinalPattern.test(input.prompt);
    const wantsNewImage = newImagePattern.test(input.prompt);

    for (const task of normalized.tasks) {
      if (hasUploads && task.inputImageIds.length === 0) {
        task.inputImageIds = [...input.imageIds];
      } else if (task.inputImageIds.length === 0) {
        const ordinalId = hasOrdinal
          ? this.resolveOrdinalImageId(input.prompt, input.resultGroupImages ?? [])
          : undefined;
        const historyId = ordinalId ?? input.selectedImageId ?? input.latestImageId;
        if (historyId && (hasEditIntent || hasOrdinal || normalized.useHistoryImage)) {
          task.inputImageIds = [historyId];
        }
      }
    }

    if (regeneratePattern.test(input.prompt) && !wantsNewImage) {
      const regenPrompt = input.lastUserPrompt?.trim() || input.prompt;
      const regenSource =
        this.resolveOrdinalImageId(input.prompt, input.resultGroupImages ?? []) ??
        input.selectedImageId ??
        input.latestImageId;
      normalized.tasks = normalized.tasks.map((task) => ({
        ...task,
        prompt: regenPrompt,
        inputImageIds: regenSource ? [regenSource] : task.inputImageIds,
      }));
      normalized.taskType = regenSource
        ? regenPrompt.trim()
          ? 'text_image_to_image'
          : 'image_to_image'
        : 'text_to_image';
      normalized.useHistoryImage = Boolean(regenSource);
    } else if (
      hasEditIntent &&
      !wantsNewImage &&
      normalized.tasks.some((task) => task.inputImageIds.length > 0)
    ) {
      normalized.taskType = input.prompt.trim() ? 'text_image_to_image' : 'image_to_image';
      normalized.useHistoryImage = true;
    } else if (
      normalized.tasks.every((task) => task.inputImageIds.length === 0) &&
      !wantsNewImage &&
      hasEditIntent
    ) {
      throw new BadRequestException(
        '检测到编辑语义但缺少可用参考图（selectedImageId / latestImageId），请先选择或生成一张图片',
      );
    } else if (
      normalized.tasks.every((task) => task.inputImageIds.length === 0) &&
      normalized.taskType !== 'text_to_image' &&
      normalized.taskType !== 'image_chat' &&
      normalized.taskType !== 'unknown'
    ) {
      normalized.taskType = 'text_to_image';
    } else if (normalized.tasks.some((task) => task.inputImageIds.length > 0)) {
      normalized.taskType = normalized.tasks[0]?.prompt.trim()
        ? 'text_image_to_image'
        : 'image_to_image';
    }

    const targetCount = this.resolveTargetImageCount(input, normalized);
    const expanded = this.expandTasksToImageCount(normalized, input, targetCount);
    expanded.generationMode =
      expanded.generationMode === 'serial' || serialPattern.test(input.prompt)
        ? 'serial'
        : 'parallel';

    this.validatePlan(expanded);
    return expanded;
  }

  private resolveTargetImageCount(input: PlannerInput, plan: GenerationPlan): number {
    const fromPrompt = parseImageCountFromPrompt(input.prompt);
    const isRegenerate = regeneratePattern.test(input.prompt) && !newImagePattern.test(input.prompt);
    const isSingleEdit =
      (editReferencePattern.test(input.prompt) || isRegenerate || ordinalPattern.test(input.prompt)) &&
      !fromPrompt;

    if (isSingleEdit) return 1;

    const requested = Math.max(input.count ?? 1, fromPrompt ?? 1, plan.imageCount ?? 1);
    return Math.min(4, Math.max(1, requested));
  }

  private expandTasksToImageCount(
    plan: GenerationPlan,
    input: PlannerInput,
    targetCount: number,
  ): GenerationPlan {
    const baseTask = plan.tasks[0] ?? {
      index: 1,
      prompt: input.prompt,
      inputImageIds: [] as string[],
      size: input.size,
    };
    const isRegenerate = regeneratePattern.test(input.prompt) && !newImagePattern.test(input.prompt);
    const userPromptBase = (
      isRegenerate ? input.lastUserPrompt?.trim() || input.prompt : input.prompt
    ).trim();

    const tasks = Array.from({ length: targetCount }, (_, index) => {
      const source = plan.tasks[index] ?? plan.tasks[0] ?? baseTask;
      const taskIndex = index + 1;
      const sanitizedUserPrompt = sanitizeSingleImagePrompt(userPromptBase, taskIndex, targetCount);
      return {
        index: taskIndex,
        prompt: buildImagePrompt({
          bizType: input.bizType,
          sceneType: input.sceneType,
          userPrompt: sanitizedUserPrompt,
          referenceImageCount: (source.inputImageIds ?? baseTask.inputImageIds ?? []).length,
          history: input.messages,
        }),
        inputImageIds: [...(source.inputImageIds ?? baseTask.inputImageIds ?? [])],
        size: source.size ?? input.size,
        ...(plan.generationMode === 'serial' && index > 0 ? { dependsOnIndex: index } : {}),
      };
    });

    return {
      ...plan,
      imageCount: targetCount,
      tasks,
    };
  }

  private resolveOrdinalImageId(
    prompt: string,
    resultGroupImages: ResultGroupImage[],
  ): string | undefined {
    const match = prompt.match(ordinalPattern);
    if (!match?.[1]) return undefined;
    const index = chineseOrdinals[match[1]] ?? Number(match[1]);
    if (!index || index < 1 || index > 4) return undefined;
    return resultGroupImages.find((image) => image.imageIndex === index)?.id;
  }

  private createDeterministicPlan(input: PlannerInput): GenerationPlan {
    const hasUploads = input.imageIds.length > 0;
    const hasOrdinal = ordinalPattern.test(input.prompt);
    const isRegenerate = regeneratePattern.test(input.prompt) && !newImagePattern.test(input.prompt);
    const shouldUseHistory =
      !hasUploads &&
      Boolean(input.latestImageId || input.selectedImageId) &&
      (editReferencePattern.test(input.prompt) || isRegenerate || hasOrdinal);

    const ordinalId = hasOrdinal
      ? this.resolveOrdinalImageId(input.prompt, input.resultGroupImages ?? [])
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

    const taskType: TaskType =
      inputImageIds.length === 0
        ? 'text_to_image'
        : effectivePrompt.trim()
          ? 'text_image_to_image'
          : 'image_to_image';
    const serial = serialPattern.test(input.prompt);
    const count = Math.max(1, Math.min(input.count, 4));

    return {
      taskType,
      imageCount: count,
      generationMode: serial ? 'serial' : 'parallel',
      useHistoryImage: shouldUseHistory,
      useUploadedImages: hasUploads,
      needGenerate: true,
      tasks: Array.from({ length: count }, (_, index) => ({
        index: index + 1,
        prompt: buildImagePrompt({
          bizType: input.bizType,
          sceneType: input.sceneType,
          userPrompt: sanitizeSingleImagePrompt(effectivePrompt, index + 1, count),
          referenceImageCount: inputImageIds.length,
          history: input.messages,
        }),
        inputImageIds,
        size: input.size,
        ...(serial && index > 0 ? { dependsOnIndex: index } : {}),
      })),
    };
  }

  private async createLivePlan(input: PlannerInput): Promise<GenerationPlan> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('缺少 DEEPSEEK_API_KEY');
    const response = await fetch(
      `${(process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
          response_format: { type: 'json_object' },
          temperature: 0.2,
          messages: [
            { role: 'system', content: DEEPSEEK_PLANNER_SYSTEM_PROMPT },
            {
              role: 'user',
              content: JSON.stringify({
                bizType: input.bizType,
                sceneType: input.sceneType,
                prompt: input.prompt,
                imageIds: input.imageIds,
                count: input.count,
                size: input.size,
                latestImageId: input.latestImageId,
                selectedImageId: input.selectedImageId,
                latestResultGroupId: input.latestResultGroupId,
                resultGroupImages: input.resultGroupImages,
                lastUserPrompt: input.lastUserPrompt,
                messages: input.messages.slice(-8),
              }),
            },
          ],
        }),
      },
    );
    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `DeepSeek 规划失败 (${response.status}): ${detail.slice(0, 240)}`,
      );
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `DeepSeek 返回了非 JSON 响应: ${detail.slice(0, 240)}`,
      );
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new ServiceUnavailableException('DeepSeek 未返回任务规划');
    const plan = JSON.parse(content) as GenerationPlan;
    return {
      ...plan,
      tasks: plan.tasks.map((task) => ({
        ...task,
        prompt: buildImagePrompt({
          bizType: input.bizType,
          sceneType: input.sceneType,
          userPrompt: task.prompt,
          referenceImageCount: task.inputImageIds?.length ?? 0,
          history: input.messages,
        }),
      })),
    };
  }
}
