import type { NovaCanvasClient } from '@novacanvas/sdk';
import type { GenerationTask } from '@novacanvas/types';
import type {
  GenerateProvider,
  GenerateSubscribeCallbacks,
  GenerateSubmitResult,
  GenerateTaskQueryResult,
} from '../types';

export class WebSocketGenerateProvider implements GenerateProvider {
  readonly type = 'websocket' as const;

  constructor(private readonly client: NovaCanvasClient) {}

  submitTask(input: Parameters<NovaCanvasClient['createGeneration']>[0]): Promise<GenerateSubmitResult> {
    return this.client.createGeneration(input);
  }

  queryTask(taskId: string): Promise<GenerateTaskQueryResult> {
    return this.client.getTask(taskId);
  }

  retryTask(taskId: string): Promise<GenerationTask> {
    return this.client.retryTask(taskId);
  }

  cancelTask(taskId: string): Promise<GenerationTask> {
    return this.client.cancelTask(taskId);
  }

  subscribeTask(conversationId: string, callbacks: GenerateSubscribeCallbacks): () => void {
    return this.client.connectConversation(
      conversationId,
      callbacks.onEvent,
      callbacks.onStatusChange,
      callbacks.onReconcile,
    );
  }
}
