export interface ConversationViewMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  status: 'success' | 'streaming' | 'error';
}
