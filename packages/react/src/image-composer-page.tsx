import type { ComposerAttachment } from '@company/ai-studio-sdk/types';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Message,
  Progress,
  Tooltip,
} from '@arco-design/web-react';
import {
  Check,
  Clock3,
  Images,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  X,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getBizConfig } from '@novacanvas/biz-config';
import type {
  BizType,
  CanvasMode,
  GeneratedImage,
  GenerationTask,
  ImageResolutionCap,
} from '@novacanvas/types';
import type {
  NovaCanvasConnectionStatus,
  NovaCanvasSocketEvent,
  UploadImageResponse,
} from '@novacanvas/sdk';
import { NovaCanvasProvider, useNovaCanvas, useNovaCanvasClient } from './provider';
import { AiStudioConversation } from './ai-studio-conversation';
import {
  buildConversationItems,
  type ActiveGenerationBatch,
  type TurnMeta,
} from './build-conversation-items';
import {
  buildGenerationSlots,
  isBatchComplete,
  isBatchRenderedInHistory,
} from './generation-slots';
import { createOptimisticBatch } from './optimistic-batch';
import { useTurnSuggestions } from './use-turn-suggestions';
import {
  GENERATION_BUSY_MESSAGE,
  isConversationGenerating,
} from './generation-lock';
import {
  clampSettingsToMaxResolution,
  createDefaultImageSizeSettings,
  normalizeRatio,
  settingsToImageSize,
  type ImageSizeSettings,
} from './image-size-settings';
import './styles.scss';

export interface ImageComposerPageProps {
  userId?: string;
  bizType: BizType;
  sceneType?: string;
  mode?: CanvasMode;
  defaultPrompt?: string;
  defaultImages?: string[];
  enableUpload?: boolean;
  enableMultiImage?: boolean;
  enableConversation?: boolean;
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  theme?: 'light' | 'dark';
  apiBaseUrl?: string;
  authToken?: string;
  metadata?: Record<string, unknown>;
  maxImageResolution?: ImageResolutionCap;
  onGenerated?: (images: GeneratedImage[]) => void;
  onTaskChange?: (tasks: GenerationTask[]) => void;
  onError?: (error: Error) => void;
}

function ImageComposerWorkspace(props: ImageComposerPageProps) {
  const client = useNovaCanvasClient();
  const state = useNovaCanvas();
  const config = getBizConfig(props.bizType);
  const [sceneType] = useState(props.sceneType ?? config.supportedSceneTypes[0]?.value ?? '');
  const [imageSizeSettings, setImageSizeSettings] = useState<ImageSizeSettings>(() =>
    createDefaultImageSizeSettings(normalizeRatio(config.defaultRatioOptions[0] ?? '1:1')),
  );
  const [count, setCount] = useState(1);
  const [theme, setTheme] = useState(props.theme ?? 'dark');
  const [composerSeed, setComposerSeed] = useState({
    key: 0,
    text: props.defaultPrompt ?? '',
  });
  const [connectionStatus, setConnectionStatus] =
    useState<NovaCanvasConnectionStatus>('disconnected');
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeBatches, setActiveBatches] = useState<ActiveGenerationBatch[]>([]);
  const [turnMetaById, setTurnMetaById] = useState<Record<string, TurnMeta>>({});

  const healthQuery = useQuery({
    queryKey: ['novacanvas-health', props.apiBaseUrl],
    queryFn: () => client.getHealth(),
    staleTime: 60_000,
  });
  const maxImageResolution =
    props.maxImageResolution ?? healthQuery.data?.imageMaxResolution ?? '2k';

  useEffect(() => {
    setImageSizeSettings((current) => clampSettingsToMaxResolution(current, maxImageResolution));
  }, [maxImageResolution]);

  const conversationQuery = useQuery({
    queryKey: ['novacanvas-conversation', state.conversationId],
    queryFn: () => client.getConversation(state.conversationId),
    enabled: Boolean(state.conversationId),
    retry: false,
    refetchInterval: (query) =>
      query.state.status !== 'error' &&
      state.tasks.some((task) => ['pending', 'running'].includes(task.status))
        ? 1200
        : false,
  });

  useEffect(() => {
    if (conversationQuery.data) state.mergeConversation(conversationQuery.data);
  }, [conversationQuery.data]);

  useEffect(() => {
    if (!state.conversationId) return;
    return client.connectConversation(
      state.conversationId,
      (event: NovaCanvasSocketEvent) => {
        if (event.type === 'task_update') {
          state.patchTask(event.taskId, { status: event.status, progress: event.progress });
        } else if (event.type === 'task_success') {
          state.patchTask(event.taskId, {
            status: 'success',
            progress: 100,
            resultImageId: event.image.id,
            resultImage: event.image,
          });
          state.addImages([event.image]);
          state.setLatestImageId(event.image.id);
          props.onGenerated?.([event.image]);
          void conversationQuery.refetch();
        } else {
          state.patchTask(event.taskId, {
            status: 'failed',
            errorMessage: event.errorMessage,
          });
        }
      },
      (status: NovaCanvasConnectionStatus) => {
        setConnectionStatus(status);
        if (status === 'connected') void conversationQuery.refetch();
      },
    );
  }, [client, state.conversationId]);

  useEffect(() => {
    props.onTaskChange?.(state.tasks);
  }, [state.tasks, props.onTaskChange]);

  interface GenerationRequest {
    prompt: string;
    imageIds: string[];
    selectedImageId?: string;
    batchId: string;
    taskCount: number;
    regenerateFromPrompt?: string;
  }

  const beginOptimisticBatch = (input: {
    batchId: string;
    prompt: string;
    taskCount: number;
    inputImageIds?: string[];
    actionType?: ActiveGenerationBatch['actionType'];
    lastUserPrompt?: string;
  }) => {
    const optimistic = createOptimisticBatch({
      batchId: input.batchId,
      count: input.taskCount,
      prompt: input.prompt,
      ratioLabel: imageSizeSettings.ratio,
      resolution: imageSizeSettings.resolution,
      inputImageIds: input.inputImageIds,
    });

    setActiveBatches((batches) => [
      ...batches,
      {
        ...optimistic.batch,
        actionType: input.actionType,
        lastUserPrompt: input.lastUserPrompt,
      },
    ]);
    state.setTasks([...state.tasks, ...optimistic.tasks]);
  };

  const rollbackOptimisticBatch = (batchId: string) => {
    setActiveBatches((batches) => batches.filter((batch) => batch.id !== batchId));
    state.setTasks(state.tasks.filter((task) => task.resultGroupId !== batchId));
  };

  const generationMutation = useMutation({
    mutationFn: (request: GenerationRequest) =>
      client.createGeneration({
        conversationId: state.conversationId || undefined,
        userId: props.userId,
        bizType: props.bizType,
        sceneType,
        prompt: request.prompt,
        imageIds: request.imageIds,
        selectedImageId: request.selectedImageId,
        count: request.taskCount,
        size: settingsToImageSize(imageSizeSettings),
        metadata: props.metadata,
        regenerateFromPrompt: request.regenerateFromPrompt,
      }),
    onSuccess: (result, request) => {
      state.setConversationId(result.conversationId);
      const hasReferences = request.imageIds.length > 0 || Boolean(request.selectedImageId);
      const batchId = request.batchId;

      setActiveBatches((batches) =>
        batches.map((batch) =>
          batch.id === batchId
            ? {
                ...batch,
                taskIds: result.tasks.map((task) => task.id),
                suggestions: result.regenerateContext?.suggestions ?? batch.suggestions,
                lastUserPrompt:
                  result.regenerateContext?.lastUserPrompt ?? batch.lastUserPrompt,
              }
            : batch,
        ),
      );

      if (result.regenerateContext) {
        setTurnMetaById((meta) => ({
          ...meta,
          [batchId]: {
            actionType: 'regenerate',
            lastUserPrompt: result.regenerateContext!.lastUserPrompt,
            suggestions: result.regenerateContext!.suggestions,
          },
        }));
      }

      state.setTasks([
        ...state.tasks.filter((task) => task.resultGroupId !== batchId),
        ...result.tasks.map(
          (task, index): GenerationTask => ({
            id: task.id,
            status: task.status,
            progress: 0,
            taskType: hasReferences ? 'text_image_to_image' : 'text_to_image',
            prompt: request.prompt,
            inputImageIds: request.imageIds.length
              ? request.imageIds
              : request.selectedImageId
                ? [request.selectedImageId]
                : [],
            resultGroupId: batchId,
            imageIndex: index + 1,
          }),
        ),
      ]);
      setComposerSeed((seed) => ({ key: seed.key + 1, text: '' }));
      window.setTimeout(() => void conversationQuery.refetch(), 300);
    },
    onError: (error: Error, request) => {
      rollbackOptimisticBatch(request.batchId);
      Message.error(error.message);
      props.onError?.(error);
    },
  });

  const generatedImages = useMemo(
    () => state.images.filter((image): image is GeneratedImage => image.type === 'generated'),
    [state.images],
  );
  const conversationItems = useMemo(
    () =>
      buildConversationItems({
        messages: state.messages,
        images: generatedImages,
        tasks: state.tasks,
        activeBatches,
        turnMetaById,
        ratioLabel: imageSizeSettings.ratio,
        resolution: imageSizeSettings.resolution,
      }),
    [activeBatches, generatedImages, imageSizeSettings, state.messages, state.tasks, turnMetaById],
  );

  const { loadingTurnIds } = useTurnSuggestions({
    client,
    bizType: props.bizType,
    sceneType,
    items: conversationItems,
    turnMetaById,
    onTurnMetaChange: setTurnMetaById,
  });

  useEffect(() => {
    setActiveBatches((batches) => {
      const next: ActiveGenerationBatch[] = [];

      for (const batch of batches) {
        const slots = buildGenerationSlots(batch.taskIds, state.tasks, generatedImages);
        const complete = isBatchComplete(slots);
        const renderedInHistory = isBatchRenderedInHistory(
          batch.taskIds,
          state.tasks,
          state.messages,
        );

        if (
          complete &&
          renderedInHistory &&
          (batch.actionType === 'regenerate' || batch.actionType === 'refine')
        ) {
          const groupId = state.tasks.find((task) => batch.taskIds.includes(task.id))
            ?.resultGroupId;
          if (groupId) {
            setTurnMetaById((meta) => ({
              ...meta,
              [groupId]: {
                actionType: batch.actionType,
                lastUserPrompt: batch.lastUserPrompt,
                suggestions: batch.suggestions,
              },
            }));
          }
        }

        if (!complete || !renderedInHistory) {
          next.push(batch);
        }
      }

      return next;
    });
  }, [generatedImages, state.messages, state.tasks]);
  const uploadedImages = state.images.filter((image) => image.type === 'uploaded');
  const recentPrompts = state.messages
    .filter((message) => message.role === 'user')
    .slice(-8)
    .reverse();
  const activeTasks = state.tasks.filter((task) => ['pending', 'running'].includes(task.status));
  const isGenerationLocked = useMemo(
    () =>
      isConversationGenerating({
        isMutationPending: generationMutation.isPending,
        tasks: state.tasks,
        items: conversationItems,
      }),
    [conversationItems, generationMutation.isPending, state.tasks],
  );

  const assertGenerationIdle = () => {
    if (isGenerationLocked) {
      Message.warning(GENERATION_BUSY_MESSAGE);
      return false;
    }
    return true;
  };

  const buildGenerationRequest = (
    effectivePrompt: string,
    imageIds: string[],
    batchId: string,
    taskCount: number,
    selectedImageId?: string,
  ): GenerationRequest => ({
    prompt: effectivePrompt,
    imageIds,
    selectedImageId: imageIds.length ? undefined : selectedImageId ?? state.selectedImageId,
    batchId,
    taskCount,
  });

  const handleSend = async (
    value: string,
    context: { attachments: ComposerAttachment[] },
  ) => {
    if (!assertGenerationIdle()) return;

    const trimmed = value.trim();
    if (!trimmed) {
      Message.warning('请输入创作指令');
      return;
    }

    state.setSelectedImageId(undefined);

    const batchId = `batch-${Date.now()}`;
    beginOptimisticBatch({
      batchId,
      prompt: trimmed,
      taskCount: count,
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
        userId: props.userId,
      });
      state.addImages([result.image]);
      imageIds.push(result.imageId);
    }

    if (imageIds.length > 0) {
      state.setTasks(
        state.tasks.map((task) =>
          task.resultGroupId === batchId
            ? { ...task, inputImageIds: imageIds, taskType: 'text_image_to_image' }
            : task,
        ),
      );
    }

    try {
      await generationMutation.mutateAsync(
        buildGenerationRequest(trimmed, imageIds, batchId, count),
      );
    } catch {
      // mutation onError handles rollback
    }
  };

  const handleTurnContinueEdit = (turnPrompt: string) => {
    if (!assertGenerationIdle()) return;

    const trimmed = turnPrompt.trim();
    if (!trimmed) {
      Message.warning('未找到该轮提示词');
      return;
    }

    setComposerSeed((seed) => ({ key: seed.key + 1, text: trimmed }));
    Message.info('已将提示词填入输入框，可继续编辑');
  };

  const handleTurnRegenerate = async (turnPrompt: string, taskCount: number) => {
    if (!assertGenerationIdle()) return;

    const trimmed = turnPrompt.trim();
    if (!trimmed) {
      Message.warning('未找到该轮提示词');
      return;
    }

    const batchId = `batch-${Date.now()}`;
    beginOptimisticBatch({
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

    try {
      await generationMutation.mutateAsync({
        prompt: '重新生成',
        imageIds: [],
        batchId,
        taskCount,
        regenerateFromPrompt: trimmed,
      });
    } catch {
      rollbackOptimisticBatch(batchId);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    if (!assertGenerationIdle()) return;
    setComposerSeed((seed) => ({ key: seed.key + 1, text: suggestion }));
  };

  const retryTask = async (taskId: string) => {
    if (!assertGenerationIdle()) return;
    try {
      const task = await client.retryTask(taskId);
      state.patchTask(taskId, task);
    } catch (error) {
      Message.error((error as Error).message);
    }
  };

  const startNewConversation = () => {
    state.reset(props.bizType, sceneType);
    setActiveBatches([]);
    setTurnMetaById({});
    setComposerSeed({ key: 0, text: '' });
    setTaskPanelOpen(false);
    setSidebarOpen(false);
  };

  return (
    <div
      className={`nova-composer nova-composer--${theme} ${
        sidebarOpen ? 'is-sidebar-open' : ''
      }`}
    >
      <aside className="nova-composer__sidebar">
        <div className="nova-composer__sidebar-heading">
          <strong>开启创作</strong>
          <div>
            <Tooltip content={theme === 'dark' ? '切换亮色主题' : '切换暗色主题'}>
              <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </Tooltip>
            <button
              className="nova-composer__sidebar-close"
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="关闭创作记录"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <button className="nova-composer__new-chat" type="button" onClick={startNewConversation}>
          <Plus size={17} />
          新对话
        </button>

        <section className="nova-composer__recent">
          <label className="nova-composer__section-label">最近</label>
          {recentPrompts.length === 0 ? (
            <div className="nova-composer__recent-empty">
              <MessageSquare size={15} />
              <span>暂无创作记录</span>
            </div>
          ) : (
            recentPrompts.map((message, index) => {
              const image = message.imageIds?.[0]
                ? state.images.find((item) => item.id === message.imageIds?.[0])
                : undefined;
              return (
                <button
                  type="button"
                  key={message.id}
                  className={index === 0 ? 'is-active' : ''}
                  disabled={isGenerationLocked}
                  onClick={() => {
                    if (!assertGenerationIdle()) return;
                    setComposerSeed((seed) => ({
                      key: seed.key + 1,
                      text: message.content,
                    }));
                  }}
                  title={message.content}
                >
                  {image ? <img src={image.url} alt="" /> : <MessageSquare size={15} />}
                  <span>{message.content}</span>
                </button>
              );
            })
          )}
        </section>

        <div className="nova-composer__sidebar-footer">
          <span className={`is-${connectionStatus}`}>
            {!state.conversationId
              ? '等待开始'
              : connectionStatus === 'connected'
                ? '实时连接正常'
                : connectionStatus === 'connecting'
                  ? '连接中'
                  : '正在重连'}
          </span>
        </div>
      </aside>

      <main className="nova-composer__main">
        <header className="nova-composer__header">
          <button
            className="nova-composer__mobile-menu"
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="打开创作记录"
          >
            <Menu size={18} />
          </button>
          <h1>{state.messages.length > 0 ? '今天' : ''}</h1>
          <button
            className={`nova-composer__task-trigger ${activeTasks.length ? 'has-active' : ''}`}
            type="button"
            onClick={() => setTaskPanelOpen((open) => !open)}
          >
            <Clock3 size={16} />
            <span>{activeTasks.length || state.tasks.length}</span>
          </button>
        </header>

        <div className="nova-composer__canvas nova-composer__canvas--ai-studio">
          <AiStudioConversation
            key={composerSeed.key}
            theme={theme}
            isEmpty={conversationItems.length === 0}
            items={conversationItems}
            imageSizeSettings={imageSizeSettings}
            maxImageResolution={maxImageResolution}
            count={count}
            defaultValue={composerSeed.text}
            isSubmitting={generationMutation.isPending}
            isInteractionLocked={isGenerationLocked}
            enableImageEdit={props.enableImageEdit}
            enableDownload={props.enableDownload}
            onImageSizeSettingsChange={setImageSizeSettings}
            onCountChange={setCount}
            onTurnContinueEdit={handleTurnContinueEdit}
            onTurnRegenerate={handleTurnRegenerate}
            onSuggestionSelect={handleSuggestionSelect}
            loadingSuggestionTurnIds={loadingTurnIds}
            onSend={handleSend}
          />
        </div>
      </main>

      <aside className={`nova-composer__tasks ${taskPanelOpen ? 'is-open' : ''}`}>
        <header>
          <div>
            <strong>任务进度</strong>
            <span>{state.tasks.length} 个任务</span>
          </div>
          <button type="button" onClick={() => setTaskPanelOpen(false)}>
            <X size={17} />
          </button>
        </header>
        <div className="nova-composer__task-list">
          {state.tasks.length === 0 ? (
            <div className="nova-composer__task-empty">
              <Images size={20} />
              <span>生成任务会显示在这里</span>
            </div>
          ) : (
            [...state.tasks].reverse().map((task, index) => (
              <article key={task.id}>
                <div className="nova-composer__task-title">
                  <span>
                    {task.status === 'success' ? (
                      <Check size={15} />
                    ) : task.status === 'failed' ? (
                      <X size={15} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div>
                    <strong>生成任务</strong>
                    <small>{task.taskType.replaceAll('_', ' ')}</small>
                  </div>
                  {task.status === 'failed' && (
                    <Tooltip content="重试任务">
                      <button
                        type="button"
                        disabled={isGenerationLocked}
                        onClick={() => void retryTask(task.id)}
                      >
                        <RefreshCw size={15} />
                      </button>
                    </Tooltip>
                  )}
                </div>
                <Progress
                  percent={task.progress}
                  size="small"
                  status={
                    task.status === 'failed'
                      ? 'error'
                      : task.status === 'success'
                        ? 'success'
                        : 'normal'
                  }
                  showText={false}
                />
                <p>{task.errorMessage ?? task.prompt}</p>
              </article>
            ))
          )}
        </div>
        {uploadedImages.length > 0 && (
          <section className="nova-composer__assets">
            <label className="nova-composer__section-label">本次素材</label>
            <div>
              {uploadedImages.slice(-6).map((image) => (
                <button key={image.id} type="button">
                  <img src={image.url} alt={image.name ?? 'Uploaded reference'} />
                </button>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}

export function ImageComposerPage(props: ImageComposerPageProps) {
  return (
    <NovaCanvasProvider
      bizType={props.bizType}
      sceneType={props.sceneType}
      baseUrl={props.apiBaseUrl}
      authToken={props.authToken}
    >
      <ImageComposerWorkspace {...props} />
    </NovaCanvasProvider>
  );
}
