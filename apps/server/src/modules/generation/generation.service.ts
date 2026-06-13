import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import type {
  BizType,
  CreateGenerationInput,
  CreateGenerationResponse,
  GeneratedImage,
  GenerationTask,
  ImageSize,
  TaskType,
} from '@novacanvas/types';
import {
  capImageSize,
  normalizeImageSize,
  parseImageResolutionCap,
  resolveImageDimensions,
} from '@novacanvas/types';
import { DataService } from '../data/data.service.js';
import { ImageModelService } from '../model/image-model.service.js';
import { PlannerService } from '../model/planner.service.js';
import { PromptSuggestionService } from '../model/prompt-suggestion.service.js';
import { ConversationGateway } from '../realtime/conversation.gateway.js';
import { StorageService } from '../storage/storage.service.js';

const regeneratePattern = /重新生成/;

interface GenerationJobData {
  taskId: string;
  userId: string;
  conversationId: string;
  bizType: BizType;
  sceneType?: string;
  taskType: TaskType;
  prompt: string;
  inputImageIds: string[];
  size: ImageSize;
  resultGroupId: string;
  imageIndex: number;
  dependencyTaskId?: string;
}

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;

@Injectable()
export class GenerationService implements OnModuleInit, OnModuleDestroy {
  private readonly live = (process.env.NOVACANVAS_QUEUE_RUNTIME ?? 'memory') === 'bullmq';
  private readonly jobData = new Map<string, GenerationJobData>();
  private queue?: Queue;
  private worker?: Worker<GenerationJobData>;

  constructor(
    private readonly data: DataService,
    private readonly planner: PlannerService,
    private readonly promptSuggestions: PromptSuggestionService,
    private readonly imageModel: ImageModelService,
    private readonly storage: StorageService,
    private readonly gateway: ConversationGateway,
  ) {}

  onModuleInit() {
    if (!this.live) return;
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const parsedRedisUrl = new URL(redisUrl);
    const connection: ConnectionOptions = {
      host: parsedRedisUrl.hostname,
      port: Number(parsedRedisUrl.port || 6379),
      username: parsedRedisUrl.username || undefined,
      password: parsedRedisUrl.password || undefined,
      maxRetriesPerRequest: null,
    };
    this.queue = new Queue('novacanvas-image', { connection });
    this.worker = new Worker<GenerationJobData>(
      'novacanvas-image',
      (job) => this.process(job.data),
      { connection, concurrency: Number(process.env.IMAGE_QUEUE_CONCURRENCY ?? 2) },
    );
    this.worker.on('failed', (job, error) => {
      if (job) void this.failTask(job.data, error);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async create(input: CreateGenerationInput): Promise<CreateGenerationResponse> {
    const userId = await this.data.ensureUser(input.userId);
    const conversationId = await this.data.ensureConversation({
      conversationId: input.conversationId,
      userId,
      bizType: input.bizType,
      sceneType: input.sceneType,
    });
    const imageIds = input.imageIds ?? [];
    await this.data.attachImagesToConversation(conversationId, imageIds);

    if (input.selectedImageId) {
      await this.data.setSelectedImage(conversationId, input.selectedImageId);
    }

    const context = await this.data.getRecentContext(conversationId);
    const maxResolution = parseImageResolutionCap(process.env.OPENAI_IMAGE_MAX_RESOLUTION ?? '2k');
    const size: ImageSize = input.size
      ? capImageSize(normalizeImageSize(input.size), maxResolution)
      : capImageSize('1024x1024', maxResolution);

    const isRegenerate = regeneratePattern.test(input.prompt.trim());
    let regenerateContext: CreateGenerationResponse['regenerateContext'];

    const plan = await this.planner.createPlan({
      bizType: input.bizType,
      sceneType: input.sceneType,
      prompt: input.prompt,
      imageIds,
      count: input.count ?? 1,
      size,
      latestImageId: context.latestImageId,
      selectedImageId: input.selectedImageId ?? context.selectedImageId,
      latestResultGroupId: context.latestResultGroupId,
      resultGroupImages: context.resultGroupImages,
      lastUserPrompt: context.lastUserPrompt,
      messages: context.messages,
      metadata: input.metadata,
    });

    if (!plan.needGenerate) {
      throw new BadRequestException('当前输入不需要生成图片');
    }

    if (isRegenerate) {
      const lastUserPrompt =
        input.regenerateFromPrompt?.trim() || context.lastUserPrompt?.trim();
      if (!lastUserPrompt) {
        throw new BadRequestException('未找到可用于重新生成的上一句用户消息');
      }

      const regen = await this.promptSuggestions.createRegenerateContext({
        bizType: input.bizType,
        sceneType: input.sceneType,
        lastUserPrompt,
        messages: context.messages,
      });

      regenerateContext = {
        lastUserPrompt: regen.lastUserPrompt,
        suggestions: regen.suggestions,
      };

      plan.taskType = 'text_to_image';
      plan.useHistoryImage = false;
      plan.tasks = plan.tasks.map((task) => ({
        ...task,
        prompt: regen.variedPrompt,
        inputImageIds: [],
      }));
    }

    const resultGroupId = makeId('grp');

    await this.data.addMessage(conversationId, {
      role: 'user',
      content: input.prompt,
      imageIds,
    });

    const tasks: GenerationTask[] = [];
    for (const planned of plan.tasks) {
      const task = await this.data.createTask({
        userId,
        conversationId,
        bizType: input.bizType,
        sceneType: input.sceneType,
        status: 'pending',
        taskType: plan.taskType,
        prompt: planned.prompt,
        inputImageIds: planned.inputImageIds,
        resultGroupId,
        imageIndex: planned.index,
        metadata: {
          ...(input.metadata ?? {}),
          resultGroupId,
          imageIndex: planned.index,
          inputImageIds: planned.inputImageIds,
          bizType: input.bizType,
          sceneType: input.sceneType,
        },
      });
      const dependencyTask = planned.dependsOnIndex
        ? tasks[planned.dependsOnIndex - 1]
        : undefined;
      const payload: GenerationJobData = {
        taskId: task.id,
        userId,
        conversationId,
        bizType: input.bizType,
        sceneType: input.sceneType,
        taskType: plan.taskType,
        prompt: planned.prompt,
        inputImageIds: planned.inputImageIds,
        size: planned.size,
        resultGroupId,
        imageIndex: planned.index,
        dependencyTaskId: dependencyTask?.id,
      };
      this.jobData.set(task.id, payload);
      tasks.push(task);
    }

    await this.data.setLatestResultGroup(conversationId, resultGroupId);

    await this.data.addMessage(conversationId, {
      role: 'assistant',
      content: `已拆分为 ${tasks.length} 个${plan.generationMode === 'serial' ? '串行' : '并行'}生成任务。`,
      taskIds: tasks.map((task) => task.id),
      resultGroupId,
    });
    for (const task of tasks) {
      await this.enqueue(this.jobData.get(task.id)!);
    }
    return {
      conversationId,
      tasks: tasks.map(({ id, status }) => ({ id, status })),
      regenerateContext,
    };
  }

  async createPromptSuggestions(input: {
    bizType: CreateGenerationInput['bizType'];
    sceneType?: string;
    lastUserPrompt: string;
  }) {
    const lastUserPrompt = input.lastUserPrompt.trim();
    if (!lastUserPrompt) {
      throw new BadRequestException('缺少用户提示词');
    }

    const result = await this.promptSuggestions.createPromptSuggestions({
      bizType: input.bizType,
      sceneType: input.sceneType,
      lastUserPrompt,
    });

    return {
      suggestions: result.suggestions,
    };
  }

  getTask(taskId: string) {
    return this.data.getTask(taskId);
  }

  async retry(taskId: string) {
    const payload = this.jobData.get(taskId);
    if (!payload) throw new NotFoundException('当前进程中没有该任务的重试上下文');
    await this.data.updateTask(taskId, {
      status: 'pending',
      progress: 0,
      errorMessage: undefined,
      resultImageId: undefined,
      resultImageIds: undefined,
    });
    await this.enqueue(payload);
    return this.data.getTask(taskId);
  }

  async cancel(taskId: string) {
    const task = await this.data.updateTask(taskId, { status: 'cancelled', progress: 0 });
    const payload = this.jobData.get(taskId);
    if (payload) {
      this.gateway.emitTaskEvent(payload.conversationId, {
        type: 'task_update',
        taskId,
        status: 'cancelled',
        progress: 0,
      });
    }
    return task;
  }

  private async enqueue(payload: GenerationJobData) {
    if (this.live) {
      await this.queue!.add('generate', payload, {
        jobId: `${payload.taskId}-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1500 },
        removeOnComplete: 100,
        removeOnFail: 100,
      });
      return;
    }
    setTimeout(() => {
      void this.process(payload).catch((error: unknown) =>
        this.failTask(
          payload,
          error instanceof Error ? error : new Error('图片生成任务执行失败'),
        ),
      );
    }, 250);
  }

  private assertInputImagesForEditTask(payload: GenerationJobData) {
    if (
      (payload.taskType === 'image_to_image' || payload.taskType === 'text_image_to_image') &&
      payload.inputImageIds.length === 0
    ) {
      throw new BadRequestException(
        `taskType 为 ${payload.taskType} 时必须携带 inputImageIds，不允许降级为 text_to_image`,
      );
    }
  }

  private async process(payload: GenerationJobData) {
    const current = await this.data.getTask(payload.taskId);
    if (current.status === 'cancelled') return;
    if (payload.dependencyTaskId) {
      await this.waitForDependency(payload.dependencyTaskId);
      const dependency = await this.data.getTask(payload.dependencyTaskId);
      if (dependency.resultImageId) payload.inputImageIds = [dependency.resultImageId];
    }

    this.assertInputImagesForEditTask(payload);

    await this.progress(payload, 12);
    if (!this.live) await this.sleep(350);
    await this.progress(payload, 38);
    const referenceUrls = await this.data.getImageUrls(payload.inputImageIds);
    const outputSize = normalizeImageSize(payload.size);
    const { width, height } = resolveImageDimensions(outputSize);
    const generated = await this.imageModel.generate({
      prompt: payload.prompt,
      size: outputSize,
      bizType: payload.bizType,
      referenceUrls,
      taskType: payload.taskType,
    });
    await this.progress(payload, 82);
    if (!this.live) await this.sleep(300);
    const stored = await this.storage.save(generated.data, { extension: generated.extension });
    const image = (await this.data.createImage({
      userId: payload.userId,
      conversationId: payload.conversationId,
      url: stored.url,
      storageKey: stored.storageKey,
      type: 'generated',
      sourceImageIds: payload.inputImageIds,
      prompt: payload.prompt,
      bizType: payload.bizType,
      sceneType: payload.sceneType,
      imageIndex: payload.imageIndex,
      resultGroupId: payload.resultGroupId,
      width,
      height,
    })) as GeneratedImage;
    await this.data.setLatestImage(payload.conversationId, image.id);
    await this.data.setLatestResultGroup(payload.conversationId, payload.resultGroupId);
    await this.data.updateTask(
      payload.taskId,
      {
        status: 'success',
        progress: 100,
        resultImageId: image.id,
        resultImageIds: [image.id],
      },
      image,
    );
    await this.data.addMessage(payload.conversationId, {
      role: 'assistant',
      content: '图片已生成，可以继续基于结果调整。',
      imageIds: [image.id],
      taskIds: [payload.taskId],
      resultGroupId: payload.resultGroupId,
    });
    this.gateway.emitTaskEvent(payload.conversationId, {
      type: 'task_success',
      taskId: payload.taskId,
      status: 'success',
      image,
    });
  }

  private async progress(payload: GenerationJobData, progress: number) {
    await this.data.updateTask(payload.taskId, { status: 'running', progress });
    this.gateway.emitTaskEvent(payload.conversationId, {
      type: 'task_update',
      taskId: payload.taskId,
      status: 'running',
      progress,
    });
  }

  private async failTask(payload: GenerationJobData, error: Error) {
    await this.data.updateTask(payload.taskId, {
      status: 'failed',
      progress: 0,
      errorMessage: error.message,
    });
    this.gateway.emitTaskEvent(payload.conversationId, {
      type: 'task_failed',
      taskId: payload.taskId,
      status: 'failed',
      errorMessage: error.message,
    });
  }

  private async waitForDependency(taskId: string) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const task = await this.data.getTask(taskId);
      if (task.status === 'success') return;
      if (task.status === 'failed' || task.status === 'cancelled') {
        throw new Error('前置任务未成功，串行任务已停止');
      }
      await this.sleep(500);
    }
    throw new Error('等待前置任务超时');
  }

  private sleep(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
