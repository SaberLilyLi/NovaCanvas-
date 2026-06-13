import type {
  CreateGenerationInput,
  CreateGenerationResponse,
  GenerationTask,
  NovaCanvasSocketEvent,
} from '@novacanvas/types';
import { generateCoreConfig, type GenerateCoreConfig } from './config';
import type { GenerateTaskStore } from './task-store';
import { createOptimisticBatch } from '../optimistic-batch';
import type {
  CreateOptimisticTasksInput,
  CreateOptimisticTasksResult,
  GenerateProvider,
  ResolveSubmittedTasksInput,
} from './types';

export interface PersistedGenerateTaskSnapshot {
  conversationId: string;
  tasks: Array<Pick<GenerationTask, 'id' | 'status' | 'resultGroupId'>>;
}

export interface GenerateTaskManagerOptions {
  provider: GenerateProvider;
  store: GenerateTaskStore;
  config?: GenerateCoreConfig;
  storageKey?: string;
  onTasksChange?: (tasks: GenerationTask[]) => void;
}

export class GenerateTaskManager {
  private readonly config: GenerateCoreConfig;
  private readonly storageKey: string;
  private pollingTimers = new Map<string, number>();
  private unsubscribeRealtime?: () => void;

  constructor(private readonly options: GenerateTaskManagerOptions) {
    this.config = options.config ?? generateCoreConfig;
    this.storageKey = options.storageKey ?? 'novacanvas.generate-core.tasks';
    this.options.store.subscribe((state) => {
      this.persistSnapshot();
      this.options.onTasksChange?.(state.tasks);
    });
  }

  get tasks() {
    return this.options.store.getState().tasks;
  }

  async submit(input: CreateGenerationInput): Promise<CreateGenerationResponse> {
    const result = await this.options.provider.submitTask(input);
    this.persistSnapshot(result.conversationId, result.tasks);
    return result;
  }

  async retry(taskId: string): Promise<GenerationTask> {
    const task = await this.options.provider.retryTask(taskId);
    this.options.store.getState().updateTask(taskId, task);
    this.startPolling(taskId);
    return task;
  }

  createOptimisticTasks(input: CreateOptimisticTasksInput): CreateOptimisticTasksResult {
    const optimistic = createOptimisticBatch(input);
    this.options.store.getState().addTasks(optimistic.tasks);
    return optimistic;
  }

  rollbackGroup(resultGroupId: string) {
    const nextTasks = this.options.store
      .getState()
      .tasks.filter((task) => task.resultGroupId !== resultGroupId);

    this.options.store.getState().replaceTasks(nextTasks);
  }

  resolveSubmittedTasks(input: ResolveSubmittedTasksInput): GenerationTask[] {
    const resolvedTasks = input.tasks.map(
      (task, index): GenerationTask => ({
        id: task.id,
        status: task.status,
        progress: 0,
        taskType: input.taskType,
        prompt: input.requestPrompt,
        inputImageIds: input.imageIds.length
          ? input.imageIds
          : input.selectedImageId
            ? [input.selectedImageId]
            : [],
        resultGroupId: input.resultGroupId,
        imageIndex: index + 1,
      }),
    );

    const currentTasks = this.options.store.getState().tasks.filter(
      (task) => task.resultGroupId !== input.resultGroupId,
    );

    this.options.store.getState().replaceTasks([...currentTasks, ...resolvedTasks]);
    this.startPollingForTasks(resolvedTasks.map((task) => task.id));

    return resolvedTasks;
  }

  patchGroupInputImages(
    resultGroupId: string,
    imageIds: string[],
    taskType: GenerationTask['taskType'] = 'text_image_to_image',
  ) {
    const groupTasks = this.options.store.getState().findTasks({ resultGroupId });
    for (const task of groupTasks) {
      this.options.store.getState().updateTask(task.id, {
        inputImageIds: imageIds,
        taskType,
      });
    }
  }

  resumeActiveTasks(tasks: GenerationTask[] = this.options.store.getState().tasks) {
    const activeTaskIds = tasks
      .filter((task) => this.isTaskActive(task.status))
      .map((task) => task.id);

    this.startPollingForTasks(activeTaskIds);
    return activeTaskIds;
  }

  async stop(taskId: string): Promise<GenerationTask> {
    const task = await this.options.provider.cancelTask(taskId);
    this.options.store.getState().updateTask(taskId, task);
    this.stopPolling(taskId);
    return task;
  }

  async reconcileTask(taskId: string): Promise<GenerationTask> {
    const task = await this.options.provider.queryTask(taskId);
    this.options.store.getState().updateTask(taskId, task);
    if (!this.isTaskActive(task.status)) {
      this.stopPolling(taskId);
    }
    return task;
  }

  startPolling(taskId: string) {
    if (this.pollingTimers.has(taskId)) return;

    const startedAt = Date.now();
    let retryCount = 0;

    const run = async () => {
      try {
        const task = await this.reconcileTask(taskId);
        if (!this.isTaskActive(task.status)) return;
        retryCount = 0;
      } catch {
        retryCount += 1;
        if (retryCount > this.config.polling.maxRetry) {
          this.stopPolling(taskId);
          return;
        }
      }

      if (Date.now() - startedAt > this.config.polling.timeout) {
        this.stopPolling(taskId);
        return;
      }

      const timer = window.setTimeout(run, this.config.polling.interval);
      this.pollingTimers.set(taskId, timer);
    };

    const timer = window.setTimeout(run, this.config.polling.interval);
    this.pollingTimers.set(taskId, timer);
  }

  stopPolling(taskId: string) {
    const timer = this.pollingTimers.get(taskId);
    if (typeof timer === 'number') {
      window.clearTimeout(timer);
      this.pollingTimers.delete(taskId);
    }
  }

  stopAllPolling() {
    for (const taskId of this.pollingTimers.keys()) {
      this.stopPolling(taskId);
    }
  }

  startPollingForTasks(taskIds: string[]) {
    for (const taskId of taskIds) {
      this.startPolling(taskId);
    }
  }

  subscribeConversation(
    conversationId: string,
    callbacks: {
      onEvent?: (event: NovaCanvasSocketEvent) => void;
      onStatusChange?: (
        status: 'connecting' | 'connected' | 'disconnected' | 'error',
      ) => void;
      onReconcile?: () => void;
    } = {},
  ) {
    this.unsubscribeRealtime?.();

    if (!this.options.provider.subscribeTask) return () => undefined;

    this.unsubscribeRealtime = this.options.provider.subscribeTask(conversationId, {
      onEvent: (event) => {
        this.applyRealtimeEvent(event);
        callbacks.onEvent?.(event);
      },
      onStatusChange: callbacks.onStatusChange,
      onReconcile: callbacks.onReconcile,
    });

    return () => {
      this.unsubscribeRealtime?.();
      this.unsubscribeRealtime = undefined;
    };
  }

  restorePersistedTasks() {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as PersistedGenerateTaskSnapshot;
    } catch {
      return null;
    }
  }

  dispose() {
    this.stopAllPolling();
    this.unsubscribeRealtime?.();
    this.unsubscribeRealtime = undefined;
  }

  private applyRealtimeEvent(event: NovaCanvasSocketEvent) {
    if (event.type === 'task_update') {
      this.options.store.getState().updateTask(event.taskId, {
        status: event.status,
        progress: event.progress,
      });
      if (!this.isTaskActive(event.status)) {
        this.stopPolling(event.taskId);
      }
      return;
    }

    if (event.type === 'task_success') {
      this.options.store.getState().updateTask(event.taskId, {
        status: 'success',
        progress: 100,
        resultImageId: event.image.id,
        resultImage: event.image,
        resultImageIds: [event.image.id],
      });
      this.stopPolling(event.taskId);
      return;
    }

    this.options.store.getState().updateTask(event.taskId, {
      status: 'failed',
      errorMessage: event.errorMessage,
    });
    this.stopPolling(event.taskId);
  }

  private isTaskActive(status: GenerationTask['status']) {
    return status === 'pending' || status === 'running';
  }

  private persistSnapshot(
    conversationId?: string,
    tasks?: Array<Pick<GenerationTask, 'id' | 'status' | 'resultGroupId'>>,
  ) {
    if (typeof window === 'undefined') return;

    const currentTasks = tasks ?? this.options.store.getState().tasks;
    const nextConversationId = conversationId ?? '';
    const payload: PersistedGenerateTaskSnapshot = {
      conversationId: nextConversationId,
      tasks: currentTasks.map((task) => ({
        id: task.id,
        status: task.status,
        resultGroupId: task.resultGroupId,
      })),
    };
    window.localStorage.setItem(this.storageKey, JSON.stringify(payload));
  }
}
