import { createStore } from 'zustand/vanilla';
import type {
  BizType,
  ConversationMessage,
  ConversationState,
  GenerationTask,
  UploadedImage,
} from '@novacanvas/types';
import { mergeConversationState } from './merge-conversation';

export interface NovaCanvasStore extends ConversationState {
  setConversationId: (conversationId: string) => void;
  replaceConversation: (conversation: ConversationState) => void;
  mergeConversation: (conversation: ConversationState) => void;
  addImages: (images: UploadedImage[]) => void;
  addMessage: (message: ConversationMessage) => void;
  setTasks: (
    tasksOrUpdater: GenerationTask[] | ((currentTasks: GenerationTask[]) => GenerationTask[]),
  ) => void;
  patchTask: (taskId: string, patch: Partial<GenerationTask>) => void;
  setSelectedImageId: (imageId?: string) => void;
  setLatestImageId: (imageId?: string) => void;
  reset: (bizType: BizType, sceneType?: string) => void;
}

export const createNovaCanvasStore = (bizType: BizType, sceneType?: string) =>
  createStore<NovaCanvasStore>((set) => ({
    conversationId: '',
    bizType,
    sceneType,
    messages: [],
    images: [],
    tasks: [],
    latestImageId: undefined,
    selectedImageId: undefined,
    latestResultGroupId: undefined,
    setConversationId: (conversationId) => set({ conversationId }),
    replaceConversation: (conversation) => set(conversation),
    mergeConversation: (conversation) =>
      set((state) => mergeConversationState(state, conversation)),
    addImages: (images) =>
      set((state) => ({
        images: [
          ...state.images.filter((item) => !images.some((next) => next.id === item.id)),
          ...images,
        ],
        latestImageId: images.length
          ? images[images.length - 1]?.id ?? state.latestImageId
          : state.latestImageId,
      })),
    addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
    setTasks: (tasksOrUpdater) =>
      set((state) => ({
        tasks:
          typeof tasksOrUpdater === 'function'
            ? tasksOrUpdater(state.tasks)
            : tasksOrUpdater,
      })),
    patchTask: (taskId, patch) =>
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
      })),
    setSelectedImageId: (selectedImageId) => set({ selectedImageId }),
    setLatestImageId: (latestImageId) => set({ latestImageId }),
    reset: (nextBizType, nextSceneType) =>
      set({
        conversationId: '',
        bizType: nextBizType,
        sceneType: nextSceneType,
        messages: [],
        images: [],
        tasks: [],
        latestImageId: undefined,
        selectedImageId: undefined,
        latestResultGroupId: undefined,
      }),
  }));
