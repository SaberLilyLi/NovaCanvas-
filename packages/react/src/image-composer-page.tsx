import { Progress, Tooltip } from '@arco-design/web-react';
import { useQuery } from '@tanstack/react-query';
import { getBizConfig } from '@novacanvas/biz-config';
import type {
  BizType,
  CanvasMode,
  GeneratedImage,
  GenerationTask,
  ImageResolutionCap,
} from '@novacanvas/types';
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
import { useEffect, useRef, useState } from 'react';
import type { ComposerSubmitContext } from './composer/types';
import { ConnectionStatusBanner } from './connection-status-banner';
import { clearConversationSession } from './conversation-session';
import { readConversationIdFromUrl, writeConversationIdToUrl } from './conversation-url';
import {
  generateCoreConfig,
  type GenerateTransportType,
  useGenerateController,
  useGenerateHistory,
} from './generate-core';
import {
  clampSettingsToMaxResolution,
  createDefaultImageSizeSettings,
  getDimensionsForRatio,
  normalizeRatio,
  type ImageSizeSettings,
} from './image-size-settings';
import type { GenerationImageActionContext } from './generation-image-actions';
import { NovaCanvasConversation } from './nova-canvas-conversation';
import { NovaCanvasProvider, useNovaCanvas, useNovaCanvasClient } from './provider';
import './styles.scss';

export interface ImageComposerSharedProps {
  enableModelSelector?: boolean;
  availableGenerationModels?: Array<{
    label: string;
    value: string;
  }>;
  runtimeConfig?: {
    provider?: GenerateTransportType;
    models?: {
      generation?: string;
      suggestions?: string;
    };
  };
  modelConfig?: {
    generationModel?: string;
    suggestionModel?: string;
  };
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

export interface ImageComposerWorkspaceProps extends ImageComposerSharedProps {}

export interface ImageComposerPageProps extends ImageComposerSharedProps {
  apiBaseUrl?: string;
  authToken?: string;
}

function resolveRuntimeConfig(props: ImageComposerSharedProps) {
  return {
    provider: props.runtimeConfig?.provider ?? generateCoreConfig.provider,
    generationModel:
      props.runtimeConfig?.models?.generation ?? props.modelConfig?.generationModel,
    suggestionModel:
      props.runtimeConfig?.models?.suggestions ?? props.modelConfig?.suggestionModel,
  };
}

export function ImageComposerWorkspace(props: ImageComposerWorkspaceProps) {
  const client = useNovaCanvasClient();
  const state = useNovaCanvas();
  const mergeConversation = useNovaCanvas((store) => store.mergeConversation);
  const setConversationId = useNovaCanvas((store) => store.setConversationId);
  const resetConversation = useNovaCanvas((store) => store.reset);
  const runtimeConfig = resolveRuntimeConfig(props);
  const config = getBizConfig(props.bizType);
  const [sceneType] = useState(props.sceneType ?? config.supportedSceneTypes[0]?.value ?? '');
  const [imageSizeSettings, setImageSizeSettings] = useState<ImageSizeSettings>(() =>
    createDefaultImageSizeSettings(normalizeRatio(config.defaultRatioOptions[0] ?? '1:1')),
  );
  const [count, setCount] = useState(1);
  const [theme, setTheme] = useState(props.theme ?? 'light');
  const [composerSeed, setComposerSeed] = useState({
    key: 0,
    text: props.defaultPrompt ?? '',
  });
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedGenerationModel, setSelectedGenerationModel] = useState<string | undefined>(
    () => runtimeConfig.generationModel,
  );
  const batchesRestoredRef = useRef(false);

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

  useEffect(() => {
    setSelectedGenerationModel(runtimeConfig.generationModel);
  }, [runtimeConfig.generationModel]);

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

  const controller = useGenerateController({
    bizType: props.bizType,
    sceneType,
    userId: props.userId,
    metadata: props.metadata,
    model: selectedGenerationModel,
    provider: runtimeConfig.provider,
    imageSizeSettings,
    conversationItems: [],
    onGenerated: props.onGenerated,
    onError: props.onError,
    onReconcile: () => {
      void conversationQuery.refetch();
    },
    sessionOptions: {
      onExternalConversationChange: (conversationId: string) => {
        batchesRestoredRef.current = false;
        setConversationId(conversationId);
        writeConversationIdToUrl(conversationId);
      },
      onSessionCleared: () => {
        batchesRestoredRef.current = false;
        resetConversation(props.bizType, sceneType);
        writeConversationIdToUrl(null);
      },
    },
  });
  const {
    sessionState,
    viewModel,
    connectionStatus,
    generatedImages,
    activeTasks,
    showConnectionBanner,
    isGenerationLocked,
    isSubmitting,
    submit,
    continueEdit,
    regenerate,
    retryTask,
    acceptSuggestion,
    resetForNewConversation,
    syncConversation,
    subscribeConversation,
    resolveInitialConversationId,
  } = controller;
  const initializedRef = useRef(false);

  useEffect(() => {
    writeConversationIdToUrl(state.conversationId || null);
  }, [state.conversationId]);

  useEffect(() => {
    if (initializedRef.current) return;

    const fromUrl = readConversationIdFromUrl();
    batchesRestoredRef.current = false;

    const conversationId = resolveInitialConversationId(fromUrl);
    if (conversationId) {
      initializedRef.current = true;
      setConversationId(conversationId);
      return;
    }

    initializedRef.current = true;
    resetConversation(props.bizType, sceneType);
    resetForNewConversation();
  }, [
    props.bizType,
    resetConversation,
    resetForNewConversation,
    resolveInitialConversationId,
    sceneType,
    setConversationId,
  ]);

  useEffect(() => {
    if (conversationQuery.data) {
      mergeConversation(conversationQuery.data);
    }
  }, [conversationQuery.data, mergeConversation]);

  useEffect(() => {
    if (!conversationQuery.data || batchesRestoredRef.current) return;
    batchesRestoredRef.current = true;

    const imageSize = sessionState.session?.imageSize;
    if (imageSize) {
      const { width, height } = getDimensionsForRatio(
        imageSize.ratioLabel,
        imageSize.resolution,
      );
      setImageSizeSettings(
        clampSettingsToMaxResolution(
          {
            ratio: imageSize.ratioLabel,
            resolution: imageSize.resolution,
            width,
            height,
            linked: true,
          },
          maxImageResolution,
        ),
      );
    }

    syncConversation();
  }, [conversationQuery.data, maxImageResolution, sessionState.session?.imageSize, syncConversation]);

  useEffect(() => {
    if (!conversationQuery.isError) return;

    const message = (conversationQuery.error as Error | undefined)?.message ?? '';
    if (!message.includes('404') && !message.includes('不存在')) return;

    clearConversationSession(props.bizType);
    sessionState.reload();
    writeConversationIdToUrl(null);
    batchesRestoredRef.current = false;
    resetConversation(props.bizType, sceneType);
    resetForNewConversation();
  }, [
    conversationQuery.error,
    conversationQuery.isError,
    props.bizType,
    resetConversation,
    resetForNewConversation,
    sceneType,
    sessionState,
  ]);

  useEffect(() => {
    if (!state.conversationId) return;
    return subscribeConversation(state.conversationId);
  }, [state.conversationId, subscribeConversation]);

  useEffect(() => {
    props.onTaskChange?.(state.tasks);
  }, [props.onTaskChange, state.tasks]);

  const { items: conversationItems, loadingTurnIds } = useGenerateHistory({
    client,
    bizType: props.bizType,
    sceneType,
    model: runtimeConfig.suggestionModel,
    messages: state.messages,
    images: generatedImages,
    tasks: state.tasks,
    activeBatches: viewModel.activeBatches,
    turnMetaById: viewModel.turnMetaById,
    ratioLabel: imageSizeSettings.ratio,
    resolution: imageSizeSettings.resolution,
    onTurnMetaChange: viewModel.setTurnMetaById,
  });

  const uploadedImages = state.images.filter((image) => image.type === 'uploaded');
  const recentPrompts = state.messages
    .filter((message) => message.role === 'user')
    .slice(-8)
    .reverse();
  const generationModelOptions =
    props.availableGenerationModels ?? [
      { label: 'Seedream 4.0', value: 'doubao-seedream-4-0' },
      { label: 'Seedream 4.5', value: 'doubao-seedream-4-5' },
      { label: 'Chat Image 2', value: 'gpt-image-2' },
    ];

  const handleSend = async (value: string, context: ComposerSubmitContext) => {
    try {
      const submitted = await submit(value, context, count);
      if (submitted) {
        setComposerSeed((seed) => ({ key: seed.key + 1, text: '' }));
      }
      return submitted;
    } catch {
      // Controller handles user-facing errors.
      return false;
    }
  };

  const handleImageContinueEdit = (
    image: GeneratedImage,
    context: GenerationImageActionContext,
  ) => {
    const nextPrompt = continueEdit({ image, turnPrompt: context.turnPrompt });
    if (!nextPrompt) return;
    setComposerSeed((seed) => ({ key: seed.key + 1, text: nextPrompt }));
  };

  const handleTurnRegenerate = async (turnPrompt: string, taskCount: number) => {
    try {
      await regenerate(turnPrompt, taskCount);
    } catch {
      // Controller handles rollback and messaging.
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    const nextPrompt = acceptSuggestion(suggestion);
    if (!nextPrompt) return;
    setComposerSeed((seed) => ({ key: seed.key + 1, text: nextPrompt }));
  };

  const startNewConversation = () => {
    clearConversationSession(props.bizType);
    sessionState.reload();
    writeConversationIdToUrl(null);
    batchesRestoredRef.current = false;
    resetConversation(props.bizType, sceneType);
    resetForNewConversation();
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
          <strong>开始创作</strong>
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
          <label className="nova-composer__section-label">最近创作</label>
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
                    const nextPrompt = acceptSuggestion(message.content);
                    if (!nextPrompt) return;
                    setComposerSeed((seed) => ({
                      key: seed.key + 1,
                      text: nextPrompt,
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
                  : connectionStatus === 'error'
                    ? '连接异常，正在自动重试'
                    : '连接已断开，轮询同步中'}
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
          <ConnectionStatusBanner
            status={connectionStatus}
            visible={showConnectionBanner}
          />
          <NovaCanvasConversation
            composerKey={composerSeed.key}
            theme={theme}
            isEmpty={conversationItems.length === 0}
            items={conversationItems}
            imageSizeSettings={imageSizeSettings}
            maxImageResolution={maxImageResolution}
            count={count}
            creditCostPerImage={1}
            generationModel={selectedGenerationModel}
            generationModelOptions={generationModelOptions}
            enableModelSelector={props.enableModelSelector}
            enableUpload={props.enableUpload}
            enableMultiImage={props.enableMultiImage}
            defaultValue={composerSeed.text}
            isSubmitting={isSubmitting}
            isInteractionLocked={isGenerationLocked}
            selectedImageId={state.selectedImageId}
            enableImageEdit={props.enableImageEdit}
            enableDownload={props.enableDownload}
            onImageSizeSettingsChange={setImageSizeSettings}
            onCountChange={setCount}
            onGenerationModelChange={setSelectedGenerationModel}
            onSelectImage={(image) => state.setSelectedImageId(image.id)}
            onImageContinueEdit={handleImageContinueEdit}
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

export const ImageComposer = ImageComposerPage;
