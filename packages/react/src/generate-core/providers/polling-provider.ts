import type { NovaCanvasClient } from '@novacanvas/sdk';
import type { GenerationTask } from '@novacanvas/types';
import type {
  GenerateProvider,
  GenerateSubscribeCallbacks,
  GenerateSubmitResult,
  GenerateTaskQueryResult,
} from '../types';

export class PollingGenerateProvider implements GenerateProvider {
  readonly type = 'polling' as const;

  constructor(
    private readonly client: NovaCanvasClient,
    private readonly options: {
      interval: number;
    },
  ) {}

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

  subscribeTask(_conversationId: string, callbacks: GenerateSubscribeCallbacks): () => void {
    callbacks.onStatusChange?.('connecting');
    let active = true;

    const timer = window.setInterval(() => {
      if (!active) return;
      callbacks.onReconcile?.();
    }, this.options.interval);

    callbacks.onStatusChange?.('connected');

    return () => {
      if (!active) return;
      active = false;
      window.clearInterval(timer);
    };
  }
}
