import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  BizType,
  ConversationMessage,
  ConversationState,
  GeneratedImage,
  GenerationTask,
  ImageType,
  ResultGroupImage,
  TaskStatus,
  TaskType,
  UploadedImage,
} from '@novacanvas/types';
import { resolveLastUserPrompt } from '@novacanvas/prompt-presets';
import { PrismaService } from '../../prisma/prisma.service.js';

interface StoredConversation extends ConversationState {
  userId: string;
}

interface CreateImageInput {
  id?: string;
  userId: string;
  conversationId?: string;
  url: string;
  storageKey: string;
  type: ImageType;
  name?: string;
  sourceImageIds?: string[];
  prompt?: string;
  bizType?: BizType;
  sceneType?: string;
  width?: number;
  height?: number;
  imageIndex?: number;
  resultGroupId?: string;
}

interface CreateTaskInput {
  id?: string;
  userId: string;
  conversationId: string;
  bizType: BizType;
  sceneType?: string;
  status: TaskStatus;
  taskType: TaskType;
  prompt: string;
  inputImageIds: string[];
  resultGroupId?: string;
  imageIndex?: number;
  metadata?: Record<string, unknown>;
}

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
const now = () => new Date().toISOString();

@Injectable()
export class DataService {
  private readonly live = (process.env.NOVACANVAS_DATA_RUNTIME ?? 'memory') === 'prisma';
  private readonly conversations = new Map<string, StoredConversation>();
  private readonly tasks = new Map<
    string,
    GenerationTask & { conversationId: string; userId: string }
  >();
  private readonly images = new Map<
    string,
    UploadedImage & { storageKey: string; imageIndex?: number; resultGroupId?: string }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async ensureUser(userId = 'demo-user'): Promise<string> {
    if (!this.live) return userId;
    const user = await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: userId === 'demo-user' ? 'Demo User' : undefined },
    });
    return user.id;
  }

  async ensureConversation(input: {
    conversationId?: string;
    userId: string;
    bizType: BizType;
    sceneType?: string;
  }): Promise<string> {
    if (this.live) {
      if (input.conversationId) {
        const existing = await this.prisma.conversation.findUnique({
          where: { id: input.conversationId },
        });
        if (existing) return existing.id;
      }
      const conversation = await this.prisma.conversation.create({
        data: {
          userId: input.userId,
          bizType: input.bizType,
          sceneType: input.sceneType,
          title: 'NovaCanvas 创作会话',
        },
      });
      return conversation.id;
    }

    const id = input.conversationId ?? makeId('conv');
    if (!this.conversations.has(id)) {
      this.conversations.set(id, {
        conversationId: id,
        userId: input.userId,
        bizType: input.bizType,
        sceneType: input.sceneType,
        messages: [],
        images: [],
        tasks: [],
      });
    }
    return id;
  }

  async addMessage(
    conversationId: string,
    input: Omit<ConversationMessage, 'id' | 'createdAt'>,
  ): Promise<ConversationMessage> {
    const message: ConversationMessage = { id: makeId('msg'), createdAt: now(), ...input };
    if (this.live) {
      const record = await this.prisma.message.create({
        data: {
          conversationId,
          role: message.role,
          content: message.content,
          imageIds: message.imageIds ?? [],
          taskIds: message.taskIds ?? [],
        },
      });
      return { ...message, id: record.id, createdAt: record.createdAt.toISOString() };
    }
    const conversation = this.requireMemoryConversation(conversationId);
    conversation.messages.push(message);
    return message;
  }

  async createImage(input: CreateImageInput): Promise<UploadedImage | GeneratedImage> {
    const id = input.id ?? makeId('img');
    if (this.live) {
      const image = await this.prisma.image.create({
        data: {
          id,
          userId: input.userId,
          conversationId: input.conversationId,
          url: input.url,
          storageKey: input.storageKey,
          type: input.type,
          sourceImageIds: input.sourceImageIds ?? [],
          prompt: input.prompt,
          bizType: input.bizType,
          sceneType: input.sceneType,
          width: input.width,
          height: input.height,
          imageIndex: input.imageIndex,
          resultGroupId: input.resultGroupId,
        } as never,
      });
      return this.mapImageRecord(image);
    }

    const image = {
      id,
      url: input.url,
      type: input.type,
      name: input.name,
      createdAt: now(),
      storageKey: input.storageKey,
      prompt: input.prompt,
      sourceImageIds: input.sourceImageIds,
      width: input.width,
      height: input.height,
      imageIndex: input.imageIndex,
      resultGroupId: input.resultGroupId,
    };
    this.images.set(id, image);
    if (input.conversationId) {
      this.requireMemoryConversation(input.conversationId).images.push(image);
    }
    return image as UploadedImage | GeneratedImage;
  }

  async createTask(input: CreateTaskInput): Promise<GenerationTask> {
    const task: GenerationTask = {
      id: input.id ?? makeId('task'),
      status: input.status,
      progress: 0,
      taskType: input.taskType,
      prompt: input.prompt,
      inputImageIds: input.inputImageIds,
      resultGroupId: input.resultGroupId,
      imageIndex: input.imageIndex,
      createdAt: now(),
      updatedAt: now(),
    };
    if (this.live) {
      const record = await this.prisma.generationTask.create({
        data: {
          id: task.id,
          userId: input.userId,
          conversationId: input.conversationId,
          bizType: input.bizType,
          sceneType: input.sceneType,
          status: input.status,
          taskType: input.taskType,
          prompt: input.prompt,
          inputImageIds: input.inputImageIds,
          resultGroupId: input.resultGroupId,
          imageIndex: input.imageIndex,
          metadata: input.metadata as never,
        } as never,
      });
      return { ...task, id: record.id };
    }
    this.tasks.set(task.id, { ...task, conversationId: input.conversationId, userId: input.userId });
    this.requireMemoryConversation(input.conversationId).tasks.push(task);
    return task;
  }

  async updateTask(
    taskId: string,
    patch: Partial<
      Pick<
        GenerationTask,
        'status' | 'progress' | 'resultImageId' | 'resultImageIds' | 'errorMessage'
      >
    >,
    resultImage?: GeneratedImage,
  ): Promise<GenerationTask> {
    if (this.live) {
      const record = await this.prisma.generationTask.update({
        where: { id: taskId },
        data: {
          ...patch,
          resultImageIds: patch.resultImageIds,
          updatedAt: new Date(),
        } as never,
      });
      const taskRecord = record as typeof record & {
        resultImageIds?: string[] | null;
        resultGroupId?: string | null;
        imageIndex?: number | null;
      };
      return {
        id: taskRecord.id,
        status: taskRecord.status as TaskStatus,
        progress: taskRecord.progress,
        taskType: taskRecord.taskType as TaskType,
        prompt: taskRecord.prompt,
        inputImageIds: taskRecord.inputImageIds as string[],
        resultImageId: taskRecord.resultImageId ?? undefined,
        resultImageIds: taskRecord.resultImageIds ?? undefined,
        resultGroupId: taskRecord.resultGroupId ?? undefined,
        imageIndex: taskRecord.imageIndex ?? undefined,
        resultImage,
        errorMessage: taskRecord.errorMessage ?? undefined,
        createdAt: taskRecord.createdAt.toISOString(),
        updatedAt: taskRecord.updatedAt.toISOString(),
      };
    }
    const task = this.tasks.get(taskId);
    if (!task) throw new NotFoundException('任务不存在');
    Object.assign(task, patch, { updatedAt: now(), ...(resultImage ? { resultImage } : {}) });
    const conversation = this.requireMemoryConversation(task.conversationId);
    const index = conversation.tasks.findIndex((item) => item.id === taskId);
    if (index >= 0) conversation.tasks[index] = task;
    return task;
  }

  async setLatestImage(conversationId: string, imageId: string): Promise<void> {
    if (this.live) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { latestImageId: imageId },
      });
      return;
    }
    this.requireMemoryConversation(conversationId).latestImageId = imageId;
  }

  async setSelectedImage(conversationId: string, imageId?: string): Promise<void> {
    if (this.live) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { selectedImageId: imageId ?? null } as never,
      });
      return;
    }
    this.requireMemoryConversation(conversationId).selectedImageId = imageId;
  }

  async setLatestResultGroup(conversationId: string, resultGroupId: string): Promise<void> {
    if (this.live) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { latestResultGroupId: resultGroupId } as never,
      });
      return;
    }
    this.requireMemoryConversation(conversationId).latestResultGroupId = resultGroupId;
  }

  async attachImagesToConversation(conversationId: string, imageIds: string[]): Promise<void> {
    if (!imageIds.length) return;
    if (this.live) {
      await this.prisma.image.updateMany({
        where: { id: { in: imageIds } },
        data: { conversationId },
      });
      return;
    }
    const conversation = this.requireMemoryConversation(conversationId);
    for (const imageId of imageIds) {
      const image = this.images.get(imageId);
      if (image && !conversation.images.some((item) => item.id === imageId)) {
        conversation.images.push(image);
      }
    }
  }

  async getImageUrls(imageIds: string[]): Promise<string[]> {
    if (!imageIds.length) return [];
    if (this.live) {
      const images = await this.prisma.image.findMany({
        where: { id: { in: imageIds } },
        select: { id: true, url: true },
      });
      const byId = new Map<string, string>(
        images.map((image: { id: string; url: string }) => [image.id, image.url]),
      );
      return imageIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    }
    return imageIds.flatMap((id) => {
      const image = this.images.get(id);
      return image ? [image.url] : [];
    });
  }

  async getTask(taskId: string): Promise<GenerationTask> {
    if (this.live) {
      const task = await this.prisma.generationTask.findUnique({
        where: { id: taskId },
        include: { resultImage: true },
      });
      if (!task) throw new NotFoundException('任务不存在');
      const taskRecord = task as typeof task & {
        resultImageIds?: string[] | null;
        resultGroupId?: string | null;
        imageIndex?: number | null;
      };
      return {
        id: taskRecord.id,
        status: taskRecord.status as TaskStatus,
        progress: taskRecord.progress,
        taskType: taskRecord.taskType as TaskType,
        prompt: taskRecord.prompt,
        inputImageIds: taskRecord.inputImageIds as string[],
        resultImageId: taskRecord.resultImageId ?? undefined,
        resultImageIds: taskRecord.resultImageIds ?? undefined,
        resultGroupId: taskRecord.resultGroupId ?? undefined,
        imageIndex: taskRecord.imageIndex ?? undefined,
        resultImage: taskRecord.resultImage
          ? (this.mapImageRecord(taskRecord.resultImage) as GeneratedImage)
          : undefined,
        errorMessage: taskRecord.errorMessage ?? undefined,
        createdAt: taskRecord.createdAt.toISOString(),
        updatedAt: taskRecord.updatedAt.toISOString(),
      };
    }
    const task = this.tasks.get(taskId);
    if (!task) throw new NotFoundException('任务不存在');
    return task;
  }

  async getConversation(conversationId: string): Promise<ConversationState> {
    if (this.live) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          images: { orderBy: { createdAt: 'asc' } },
          tasks: { orderBy: { createdAt: 'asc' }, include: { resultImage: true } },
        },
      });
      if (!conversation) throw new NotFoundException('会话不存在');
      const conversationRecord = conversation as typeof conversation & {
        selectedImageId?: string | null;
        latestResultGroupId?: string | null;
      };
      return {
        conversationId: conversationRecord.id,
        bizType: conversationRecord.bizType as BizType,
        sceneType: conversationRecord.sceneType ?? undefined,
        latestImageId: conversationRecord.latestImageId ?? undefined,
        selectedImageId: conversationRecord.selectedImageId ?? undefined,
        latestResultGroupId: conversationRecord.latestResultGroupId ?? undefined,
        messages: conversationRecord.messages.map(
          (message: {
            id: string;
            role: string;
            content: string;
            imageIds: unknown;
            taskIds: unknown;
            createdAt: Date;
          }) => ({
            id: message.id,
            role: message.role as ConversationMessage['role'],
            content: message.content,
            imageIds: message.imageIds as string[],
            taskIds: message.taskIds as string[],
            createdAt: message.createdAt.toISOString(),
          }),
        ),
        images: conversationRecord.images.map((image) =>
          this.mapImageRecord(image),
        ) as UploadedImage[],
        tasks: await Promise.all(
          conversationRecord.tasks.map((task: { id: string }) => this.getTask(task.id)),
        ),
      };
    }
    const { userId: _, ...conversation } = this.requireMemoryConversation(conversationId);
    return structuredClone(conversation);
  }

  async getRecentContext(conversationId: string) {
    const conversation = await this.getConversation(conversationId);
    const resultGroupImages = this.buildResultGroupImages(
      conversation.images,
      conversation.latestResultGroupId,
    );
    const lastUserPrompt = resolveLastUserPrompt(conversation.messages);
    return {
      messages: conversation.messages.slice(-8),
      latestImageId: conversation.latestImageId,
      selectedImageId: conversation.selectedImageId,
      latestResultGroupId: conversation.latestResultGroupId,
      resultGroupImages,
      lastUserPrompt,
    };
  }

  buildResultGroupImages(
    images: UploadedImage[],
    latestResultGroupId?: string,
  ): ResultGroupImage[] {
    if (!latestResultGroupId) return [];
    return images
      .filter((image): image is GeneratedImage => {
        if (image.type !== 'generated') return false;
        const generated = image as GeneratedImage;
        return (
          generated.resultGroupId === latestResultGroupId &&
          typeof generated.imageIndex === 'number'
        );
      })
      .map((image) => ({
        id: image.id,
        imageIndex: image.imageIndex!,
        resultGroupId: image.resultGroupId!,
        prompt: image.prompt,
      }))
      .sort((a, b) => a.imageIndex - b.imageIndex);
  }

  private mapImageRecord(image: {
    id: string;
    url: string;
    type: string;
    prompt: string | null;
    sourceImageIds: unknown;
    createdAt: Date;
    imageIndex?: number | null;
    resultGroupId?: string | null;
    width?: number | null;
    height?: number | null;
  }): UploadedImage | GeneratedImage {
    return {
      id: image.id,
      url: image.url,
      type: image.type as ImageType,
      prompt: image.prompt ?? undefined,
      sourceImageIds: image.sourceImageIds as string[],
      createdAt: image.createdAt.toISOString(),
      imageIndex: image.imageIndex ?? undefined,
      resultGroupId: image.resultGroupId ?? undefined,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
    };
  }

  private requireMemoryConversation(conversationId: string): StoredConversation {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new NotFoundException('会话不存在');
    return conversation;
  }
}
