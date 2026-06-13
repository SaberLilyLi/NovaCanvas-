import type { ConversationMessage } from '@novacanvas/types';

import { IMAGE_OPTIMIZE_PROMPT } from './generation-image-actions';

const META_USER_PROMPTS = new Set(['重新生成', '重新编辑', IMAGE_OPTIMIZE_PROMPT]);

export function resolveLastUserPrompt(messages: ConversationMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const content = message?.content?.trim();
    if (message?.role === 'user' && content && !META_USER_PROMPTS.has(content)) {
      return content;
    }
  }
  return undefined;
}

export function isRegenerateUserMessage(content: string): boolean {
  return content.trim() === '重新生成';
}
