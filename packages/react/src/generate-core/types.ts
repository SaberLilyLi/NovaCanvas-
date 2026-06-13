import type {
  CreateGenerationInput,
  CreateGenerationResponse,
  GenerationTask,
  NovaCanvasSocketEvent,
} from '@novacanvas/types';
import type { ResolutionTier } from '../image-size-settings';
import type { ActiveGenerationBatch } from '../build-conversation-items';

export type GenerateTransportType = 'polling' | 'websocket' | 'sse';

export interface GenerateTaskQueryResult extends GenerationTask {}

export interface GenerateSubmitResult extends CreateGenerationResponse {}

export interface GenerateSubscribeCallbacks {
  onEvent: (event: NovaCanvasSocketEvent) => void;
  onStatusChange?: (
    status: 'connecting' | 'connected' | 'disconnected' | 'error',
  ) => void;
  onReconcile?: () => void;
}

export interface GenerateProvider {
  readonly type: GenerateTransportType;
  submitTask(input: CreateGenerationInput): Promise<GenerateSubmitResult>;
  queryTask(taskId: string): Promise<GenerateTaskQueryResult>;
  retryTask(taskId: string): Promise<GenerationTask>;
  cancelTask(taskId: string): Promise<GenerationTask>;
  subscribeTask?(
    conversationId: string,
    callbacks: GenerateSubscribeCallbacks,
  ): () => void;
}

export interface GenerateTaskFilter {
  statuses?: GenerationTask['status'][];
  resultGroupId?: string;
}

export interface ResolveSubmittedTasksInput {
  resultGroupId: string;
  requestPrompt: string;
  taskType: GenerationTask['taskType'];
  imageIds: string[];
  selectedImageId?: string;
  tasks: Array<Pick<GenerationTask, 'id' | 'status'>>;
}

export interface CreateOptimisticTasksInput {
  batchId: string;
  count: number;
  prompt: string;
  ratioLabel: string;
  resolution: ResolutionTier;
  inputImageIds?: string[];
}

export interface CreateOptimisticTasksResult {
  batch: ActiveGenerationBatch;
  tasks: GenerationTask[];
}
