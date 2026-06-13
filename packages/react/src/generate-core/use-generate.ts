import { useEffect, useMemo, useRef } from 'react';
import type {
  CreateGenerationInput,
  GenerationTask,
  NovaCanvasSocketEvent,
} from '@novacanvas/types';
import { useStore } from 'zustand';
import { useNovaCanvas, useNovaCanvasClient } from '../provider';
import { createGenerateProvider } from './providers';
import { createGenerateTaskStore } from './task-store';
import { GenerateTaskManager } from './task-manager';
import { generateCoreConfig } from './config';
import type {
  CreateOptimisticTasksInput,
  GenerateTransportType,
  ResolveSubmittedTasksInput,
} from './types';

export interface UseGenerateOptions {
  provider?: GenerateTransportType;
  storageKey?: string;
  onEvent?: (event: NovaCanvasSocketEvent) => void;
  onReconcile?: () => void;
  onStatusChange?: (
    status: 'connecting' | 'connected' | 'disconnected' | 'error',
  ) => void;
}

function areTasksEqual(left: GenerationTask[], right: GenerationTask[]) {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const leftTask = left[index];
    const rightTask = right[index];
    if (!leftTask || !rightTask) return false;
    if (JSON.stringify(leftTask) !== JSON.stringify(rightTask)) return false;
  }

  return true;
}

export function useGenerate(options: UseGenerateOptions = {}) {
  const client = useNovaCanvasClient();
  const tasksFromNova = useNovaCanvas((state) => state.tasks);
  const setTasks = useNovaCanvas((state) => state.setTasks);
  const taskStoreRef = useRef(createGenerateTaskStore(tasksFromNova));
  const callbacksRef = useRef({
    onEvent: options.onEvent,
    onReconcile: options.onReconcile,
    onStatusChange: options.onStatusChange,
  });

  callbacksRef.current = {
    onEvent: options.onEvent,
    onReconcile: options.onReconcile,
    onStatusChange: options.onStatusChange,
  };

  useEffect(() => {
    const currentTasks = taskStoreRef.current.getState().tasks;
    if (areTasksEqual(currentTasks, tasksFromNova)) return;
    taskStoreRef.current.getState().replaceTasks(tasksFromNova);
  }, [tasksFromNova]);

  const manager = useMemo(() => {
    const provider = createGenerateProvider(client, options.provider ?? generateCoreConfig.provider);
    return new GenerateTaskManager({
      provider,
      store: taskStoreRef.current,
      storageKey: options.storageKey,
      onTasksChange: (tasks) =>
        setTasks((currentTasks) => (areTasksEqual(currentTasks, tasks) ? currentTasks : tasks)),
    });
  }, [client, options.provider, options.storageKey, setTasks]);

  useEffect(() => () => manager.dispose(), [manager]);

  const tasks = useStore(taskStoreRef.current, (state) => state.tasks);

  const submit = async (input: CreateGenerationInput) => {
    const result = await manager.submit(input);
    return result;
  };

  const retry = async (taskId: string) => manager.retry(taskId);

  const stop = async (taskId: string) => manager.stop(taskId);

  const syncTask = async (taskId: string) => manager.reconcileTask(taskId);

  const subscribeConversation = (conversationId: string) =>
    manager.subscribeConversation(conversationId, {
      onEvent: callbacksRef.current.onEvent,
      onReconcile: callbacksRef.current.onReconcile,
      onStatusChange: callbacksRef.current.onStatusChange,
    });

  const startPolling = (taskId: string) => manager.startPolling(taskId);
  const stopPolling = (taskId: string) => manager.stopPolling(taskId);
  const startPollingForTasks = (taskIds: string[]) => manager.startPollingForTasks(taskIds);
  const resumeActiveTasks = () => manager.resumeActiveTasks();
  const resolveSubmittedTasks = (input: ResolveSubmittedTasksInput) =>
    manager.resolveSubmittedTasks(input);
  const rollbackGroup = (resultGroupId: string) => manager.rollbackGroup(resultGroupId);
  const createOptimisticTasks = (input: CreateOptimisticTasksInput) =>
    manager.createOptimisticTasks(input);
  const patchGroupInputImages = (
    resultGroupId: string,
    imageIds: string[],
    taskType?: 'text_to_image' | 'image_to_image' | 'text_image_to_image' | 'image_chat' | 'unknown',
  ) => manager.patchGroupInputImages(resultGroupId, imageIds, taskType);

  const runningTasks = useMemo(
    () => tasks.filter((task) => task.status === 'pending' || task.status === 'running'),
    [tasks],
  );
  const finishedTasks = useMemo(
    () => tasks.filter((task) => !['pending', 'running'].includes(task.status)),
    [tasks],
  );

  return {
    tasks,
    runningTasks,
    finishedTasks,
    submit,
    retry,
    stop,
    syncTask,
    subscribeConversation,
    startPolling,
    startPollingForTasks,
    resumeActiveTasks,
    stopPolling,
    resolveSubmittedTasks,
    rollbackGroup,
    createOptimisticTasks,
    patchGroupInputImages,
    restorePersistedTasks: () => manager.restorePersistedTasks(),
  };
}
