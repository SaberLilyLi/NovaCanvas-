import type { ComposerAttachment } from '@company/ai-studio-sdk/types';
import { Message } from '@arco-design/web-react';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type { UploadImageResponse } from '@novacanvas/sdk';
import type { BizType, GeneratedImage } from '@novacanvas/types';
import type { ActiveGenerationBatch } from '../build-conversation-items';
import { GENERATION_BUSY_MESSAGE, isConversationGenerating } from '../generation-lock';
import { settingsToImageSize, type ImageSizeSettings } from '../image-size-settings';
import type { NovaConversationItem } from '../nova-conversation-view';
import { useNovaCanvas, useNovaCanvasClient } from '../provider';
import { useGenerate } from './use-generate';
import type { UseGenerateSessionOptions } from './use-generate-session';
import { useGenerateSession } from './use-generate-session';
import { useGenerateViewModel } from './use-generate-view-model';
import type { GenerateTransportType } from './types';

export interface UseGenerateControllerOptions {
  bizType: BizType;
  sceneType?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  model?: string;
  provider?: GenerateTransportType;
  imageSizeSettings: ImageSizeSettings;
  conversationItems: NovaConversationItem[];
  onGenerated?: (images: GeneratedImage[]) => void;
  onError?: (error: Error) => void;
  onConnectionStatusChange?: (
    status: 'connecting' | 'connected' | 'disconnected' | 'error',
  ) => void;
  onReconcile?: () => void;
  sessionOptions?: Partial<
    Pick<
      UseGenerateSessionOptions,
      'onExternalConversationChange' | 'onSessionCleared'
    >
  >;
}

interface GenerationRequest {
  prompt: string;
  imageIds: string[];
  selectedImageId?: string;
  batchId: string;
  taskCount: number;
  regenerateFromPrompt?: string;
}

export function useGenerateController(options: UseGenerateControllerOptions) {
  const client = useNovaCanvasClient();
  const state = useNovaCanvas();
  const generatedImages = useMemo(
    () => state.images.filter((image): image is GeneratedImage => image.type === 'generated'),
    [state.images],
  );

  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const sessionImageSize = useMemo(
    () => ({
      ratioLabel: options.imageSizeSettings.ratio,
      resolution: options.imageSizeSettings.resolution,
    }),
    [options.imageSizeSettings.ratio, options.imageSizeSettings.resolution],
  );

  const sessionState = useGenerateSession({
    bizType: options.bizType,
    userId: options.userId,
    sceneType: options.sceneType,
    conversationId: state.conversationId || undefined,
    imageSize: sessionImageSize,
    onExternalConversationChange: options.sessionOptions?.onExternalConversationChange,
    onSessionCleared: options.sessionOptions?.onSessionCleared,
  });

  const generate = useGenerate({
    provider: options.provider,
    storageKey: `novacanvas.generate-core.${options.bizType}.${options.userId ?? 'anonymous'}`,
    onEvent: (event) => {
      if (event.type === 'task_success') {
        state.addImages([event.image]);
        state.setLatestImageId(event.image.id);
        options.onGenerated?.([event.image]);
      }
    },
    onReconcile: options.onReconcile,
    onStatusChange: (status) => {
      setConnectionStatus((current) => (current === status ? current : status));
      options.onConnectionStatusChange?.(status);
    },
  });

  const viewModel = useGenerateViewModel({
    bizType: options.bizType,
    sceneType: options.sceneType,
    userId: options.userId,
    conversation: state.conversationId
      ? {
          conversationId: state.conversationId,
          bizType: state.bizType,
          sceneType: state.sceneType,
          messages: state.messages,
          images: state.images,
          tasks: state.tasks,
          latestImageId: state.latestImageId,
          selectedImageId: state.selectedImageId,
          latestResultGroupId: state.latestResultGroupId,
        }
      : undefined,
    generatedImages,
    sessionMeta: {
      imageSize: sessionState.session?.imageSize,
      batchMetaByGroupId: sessionState.session?.batchMetaByGroupId,
    },
  });

  const mutation = useMutation({
    mutationFn: (request: GenerationRequest) =>
      generate.submit({
        conversationId: state.conversationId || undefined,
        userId: options.userId,
        bizType: options.bizType,
        sceneType: options.sceneType,
        model: options.model,
        prompt: request.prompt,
        imageIds: request.imageIds,
        selectedImageId: request.selectedImageId,
        count: request.taskCount,
        size: settingsToImageSize(options.imageSizeSettings),
        metadata: options.metadata,
        regenerateFromPrompt: request.regenerateFromPrompt,
      }),
    onSuccess: (result, request) => {
      state.setConversationId(result.conversationId);
      const hasReferences = request.imageIds.length > 0 || Boolean(request.selectedImageId);

      viewModel.patchBatch(request.batchId, (batch) => ({
        ...batch,
        taskIds: result.tasks.map((task) => task.id),
        suggestions: result.regenerateContext?.suggestions ?? batch.suggestions,
        lastUserPrompt: result.regenerateContext?.lastUserPrompt ?? batch.lastUserPrompt,
      }));

      if (result.regenerateContext) {
        const regenerateContext = result.regenerateContext;
        viewModel.setTurnMetaById((meta) => ({
          ...meta,
          [request.batchId]: {
            actionType: 'regenerate',
            lastUserPrompt: regenerateContext.lastUserPrompt,
            suggestions: regenerateContext.suggestions,
          },
        }));
      }

      generate.resolveSubmittedTasks({
        resultGroupId: request.batchId,
        requestPrompt: request.prompt,
        taskType: hasReferences ? 'text_image_to_image' : 'text_to_image',
        imageIds: request.imageIds,
        selectedImageId: request.selectedImageId,
        tasks: result.tasks,
      });

      viewModel.persistBatchMeta(
        request.batchId,
        {
          ratioLabel: options.imageSizeSettings.ratio,
          resolution: options.imageSizeSettings.resolution,
          prompt: request.prompt,
        },
        result.conversationId,
      );

      window.setTimeout(() => options.onReconcile?.(), 300);
    },
    onError: (error: Error, request) => {
      viewModel.removeBatch(request.batchId);
      generate.rollbackGroup(request.batchId);
      Message.error(error.message);
      options.onError?.(error);
    },
  });

  const activeTasks = state.tasks.filter((task) => ['pending', 'running'].includes(task.status));

  const isGenerationLocked = useMemo(
    () =>
      isConversationGenerating({
        isMutationPending: mutation.isPending,
        tasks: state.tasks,
        items: options.conversationItems,
      }),
    [mutation.isPending, options.conversationItems, state.tasks],
  );

  const showConnectionBanner =
    Boolean(state.conversationId) &&
    activeTasks.length > 0 &&
    connectionStatus !== 'connected';

  const ensureIdle = useCallback(() => {
    if (isGenerationLocked) {
      Message.warning(GENERATION_BUSY_MESSAGE);
      return false;
    }

    return true;
  }, [isGenerationLocked]);

  const createOptimisticBatch = useCallback((input: {
    batchId: string;
    prompt: string;
    taskCount: number;
    generationModel?: string;
    inputImageIds?: string[];
    actionType?: ActiveGenerationBatch['actionType'];
    lastUserPrompt?: string;
  }) => {
    const optimistic = generate.createOptimisticTasks({
      batchId: input.batchId,
      count: input.taskCount,
      prompt: input.prompt,
      ratioLabel: options.imageSizeSettings.ratio,
      resolution: options.imageSizeSettings.resolution,
      inputImageIds: input.inputImageIds,
    });

    viewModel.addOptimisticBatch({
      ...optimistic.batch,
      generationModel: input.generationModel,
      actionType: input.actionType,
      lastUserPrompt: input.lastUserPrompt,
    });

    if (state.conversationId) {
      viewModel.persistBatchMeta(
        input.batchId,
        {
          ratioLabel: options.imageSizeSettings.ratio,
          resolution: options.imageSizeSettings.resolution,
          prompt: input.prompt,
        },
        state.conversationId,
      );
    }
  }, [
    generate,
    options.imageSizeSettings.ratio,
    options.imageSizeSettings.resolution,
    state.conversationId,
    viewModel,
  ]);

  const submit = useCallback(async (
    prompt: string,
    context: { attachments: ComposerAttachment[] },
    taskCount: number,
  ) => {
    if (!ensureIdle()) return false;

    const trimmed = prompt.trim();
    if (!trimmed) {
      Message.warning('请输入创作指令');
      return false;
    }

    state.setSelectedImageId(undefined);

    const batchId = `batch-${Date.now()}`;
    createOptimisticBatch({
      batchId,
      prompt: trimmed,
      taskCount,
      generationModel: options.model,
    });

    state.addMessage({
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    });

    const imageIds: string[] = [];
    for (const attachment of context.attachments) {
      if (attachment.status !== 'ready') continue;

      const result: UploadImageResponse = await client.uploadImage(attachment.file, {
        conversationId: state.conversationId || undefined,
        userId: options.userId,
      });
      state.addImages([result.image]);
      imageIds.push(result.imageId);
    }

    if (imageIds.length > 0) {
      generate.patchGroupInputImages(batchId, imageIds, 'text_image_to_image');
    }

    await mutation.mutateAsync({
      prompt: trimmed,
      imageIds,
      selectedImageId: imageIds.length ? undefined : state.selectedImageId,
      batchId,
      taskCount,
    });

    return true;
  }, [
    client,
    createOptimisticBatch,
    ensureIdle,
    generate,
    mutation,
    options.userId,
    state,
  ]);

  const continueEdit = useCallback((turnPrompt: string) => {
    if (!ensureIdle()) return null;

    const trimmed = turnPrompt.trim();
    if (!trimmed) {
      Message.warning('未找到该轮提示词');
      return null;
    }

    Message.info('已将提示词填入输入框，可继续编辑');
    return trimmed;
  }, [ensureIdle]);

  const regenerate = useCallback(async (turnPrompt: string, taskCount: number) => {
    if (!ensureIdle()) return false;

    const trimmed = turnPrompt.trim();
    if (!trimmed) {
      Message.warning('未找到该轮提示词');
      return false;
    }

    const batchId = `batch-${Date.now()}`;
    createOptimisticBatch({
      batchId,
      prompt: '重新生成',
      taskCount,
      actionType: 'regenerate',
      lastUserPrompt: trimmed,
    });

    state.addMessage({
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: '重新生成',
      createdAt: new Date().toISOString(),
    });

    await mutation.mutateAsync({
      prompt: '重新生成',
      imageIds: [],
      batchId,
      taskCount,
      regenerateFromPrompt: trimmed,
    });

    return true;
  }, [createOptimisticBatch, ensureIdle, mutation, state]);

  const retryTask = useCallback(async (taskId: string) => {
    if (!ensureIdle()) return false;

    try {
      const task = await generate.retry(taskId);
      state.patchTask(taskId, task);
      return true;
    } catch (error) {
      Message.error((error as Error).message);
      return false;
    }
  }, [ensureIdle, generate, state]);

  const acceptSuggestion = useCallback((suggestion: string) => {
    if (!ensureIdle()) return null;
    return suggestion;
  }, [ensureIdle]);

  const resetForNewConversation = useCallback(() => {
    viewModel.reset();
    sessionState.reload();
  }, [sessionState, viewModel]);

  const syncConversation = useCallback(() => generate.resumeActiveTasks(), [generate]);

  const subscribeConversation = useCallback(
    (conversationId: string) => generate.subscribeConversation(conversationId),
    [generate],
  );

  const resolveInitialConversationId = useCallback(
    (urlConversationId: string | null) =>
      sessionState.resolveInitialConversationId(urlConversationId),
    [sessionState],
  );

  return useMemo(() => ({
    providerType: options.provider,
    sessionState,
    viewModel,
    connectionStatus,
    generatedImages,
    activeTasks,
    showConnectionBanner,
    isGenerationLocked,
    isSubmitting: mutation.isPending,
    submit,
    continueEdit,
    regenerate,
    retryTask,
    acceptSuggestion,
    resetForNewConversation,
    syncConversation,
    subscribeConversation,
    resolveInitialConversationId,
  }), [
    acceptSuggestion,
    activeTasks,
    connectionStatus,
    continueEdit,
    generatedImages,
    isGenerationLocked,
    mutation.isPending,
    options.provider,
    regenerate,
    resetForNewConversation,
    resolveInitialConversationId,
    retryTask,
    sessionState,
    showConnectionBanner,
    submit,
    subscribeConversation,
    syncConversation,
    viewModel,
  ]);
}
