import { createStore } from 'zustand/vanilla';
import type { GenerationTask } from '@novacanvas/types';
import type { GenerateTaskFilter } from './types';

export interface GenerateTaskStoreState {
  tasks: GenerationTask[];
  addTask: (task: GenerationTask) => void;
  addTasks: (tasks: GenerationTask[]) => void;
  updateTask: (taskId: string, patch: Partial<GenerationTask>) => void;
  removeTask: (taskId: string) => void;
  clearTasks: () => void;
  replaceTasks: (tasks: GenerationTask[]) => void;
  getTask: (taskId: string) => GenerationTask | undefined;
  getRunningTasks: () => GenerationTask[];
  getFinishedTasks: () => GenerationTask[];
  findTasks: (filter?: GenerateTaskFilter) => GenerationTask[];
}

function mergeTasks(current: GenerationTask[], incoming: GenerationTask[]) {
  const byId = new Map(current.map((task) => [task.id, task]));

  for (const task of incoming) {
    byId.set(task.id, {
      ...byId.get(task.id),
      ...task,
    });
  }

  return Array.from(byId.values()).sort((left, right) => {
    const leftTime = Date.parse(left.createdAt ?? '') || 0;
    const rightTime = Date.parse(right.createdAt ?? '') || 0;
    return leftTime - rightTime;
  });
}

export const createGenerateTaskStore = (initialTasks: GenerationTask[] = []) =>
  createStore<GenerateTaskStoreState>((set, get) => ({
    tasks: initialTasks,
    addTask: (task) =>
      set((state) => ({
        tasks: mergeTasks(state.tasks, [task]),
      })),
    addTasks: (tasks) =>
      set((state) => ({
        tasks: mergeTasks(state.tasks, tasks),
      })),
    updateTask: (taskId, patch) =>
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
      })),
    removeTask: (taskId) =>
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== taskId),
      })),
    clearTasks: () => set({ tasks: [] }),
    replaceTasks: (tasks) => set({ tasks: [...tasks] }),
    getTask: (taskId) => get().tasks.find((task) => task.id === taskId),
    getRunningTasks: () =>
      get().tasks.filter((task) => task.status === 'pending' || task.status === 'running'),
    getFinishedTasks: () =>
      get().tasks.filter(
        (task) =>
          task.status === 'success' ||
          task.status === 'failed' ||
          task.status === 'cancelled',
      ),
    findTasks: (filter) =>
      get().tasks.filter((task) => {
        if (filter?.statuses && !filter.statuses.includes(task.status)) return false;
        if (filter?.resultGroupId && task.resultGroupId !== filter.resultGroupId) return false;
        return true;
      }),
  }));

export type GenerateTaskStore = ReturnType<typeof createGenerateTaskStore>;
