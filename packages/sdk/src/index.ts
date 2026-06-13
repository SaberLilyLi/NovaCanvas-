import { io, type Socket } from 'socket.io-client';
import type {
  ConversationState,
  CreateGenerationInput,
  CreateGenerationResponse,
  GenerationTask,
  ImageResolutionCap,
  NovaCanvasSocketEvent,
  PromptSuggestionsInput,
  PromptSuggestionsResponse,
  UploadImageResponse,
} from '@novacanvas/types';

export interface NovaCanvasClientOptions {
  baseUrl?: string;
  authToken?: string;
}

export type NovaCanvasConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export class NovaCanvasClient {
  private readonly baseUrl: string;
  private readonly authToken?: string;

  constructor(options: NovaCanvasClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'http://localhost:3001').replace(/\/$/, '');
    this.authToken = options.authToken;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api${path}`, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? `NovaCanvas request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  async uploadImage(
    file: File,
    context: { conversationId?: string; userId?: string } = {},
  ): Promise<UploadImageResponse> {
    const form = new FormData();
    form.append('file', file);
    if (context.conversationId) form.append('conversationId', context.conversationId);
    if (context.userId) form.append('userId', context.userId);
    return this.request('/upload/image', { method: 'POST', body: form });
  }

  getHealth(): Promise<{
    status: string;
    imageMaxResolution: ImageResolutionCap;
    runtime: string;
  }> {
    return fetch(`${this.baseUrl}/health`).then(async (response) => {
      if (!response.ok) {
        throw new Error(`NovaCanvas health check failed (${response.status})`);
      }
      return response.json() as Promise<{
        status: string;
        imageMaxResolution: ImageResolutionCap;
        runtime: string;
      }>;
    });
  }

  createGeneration(input: CreateGenerationInput): Promise<CreateGenerationResponse> {
    return this.request('/generation/create', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  getPromptSuggestions(
    input: PromptSuggestionsInput,
  ): Promise<PromptSuggestionsResponse> {
    return this.request('/generation/prompt-suggestions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  getConversation(conversationId: string): Promise<ConversationState> {
    return this.request(`/conversation/${conversationId}`);
  }

  getTask(taskId: string): Promise<GenerationTask> {
    return this.request(`/generation/task/${taskId}`);
  }

  retryTask(taskId: string): Promise<GenerationTask> {
    return this.request(`/generation/task/${taskId}/retry`, { method: 'POST' });
  }

  cancelTask(taskId: string): Promise<GenerationTask> {
    return this.request(`/generation/task/${taskId}/cancel`, { method: 'POST' });
  }

  connectConversation(
    conversationId: string,
    onEvent: (event: NovaCanvasSocketEvent) => void,
    onStatus?: (status: NovaCanvasConnectionStatus) => void,
    onReconcile?: () => void,
  ): () => void {
    onStatus?.('connecting');
    const socket: Socket = io(`${this.baseUrl}/conversation`, {
      path: '/ws',
      auth: { token: this.authToken },
      query: { conversationId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    const reconcile = () => onReconcile?.();
    socket.on('connect', () => {
      onStatus?.('connected');
      reconcile();
    });
    socket.io.on('reconnect', () => {
      onStatus?.('connected');
      reconcile();
    });
    socket.on('disconnect', () => onStatus?.('disconnected'));
    socket.on('connect_error', () => onStatus?.('error'));
    socket.on('task_event', onEvent);
    return () => socket.disconnect();
  }
}

export function createNovaCanvasClient(options?: NovaCanvasClientOptions): NovaCanvasClient {
  return new NovaCanvasClient(options);
}

export type * from '@novacanvas/types';
