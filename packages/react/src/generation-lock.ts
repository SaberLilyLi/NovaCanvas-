import type { GenerationTask } from '@novacanvas/types';
import type { NovaConversationItem } from './nova-conversation-view';

export const GENERATION_BUSY_MESSAGE =
  '当前有图片正在生成，请等待完成后再操作。';

export const GENERATION_BUSY_PLACEHOLDER =
  '图片生成中，请等待完成后再操作...';

export function isConversationGenerating(input: {
  isMutationPending: boolean;
  tasks: GenerationTask[];
  items: NovaConversationItem[];
}): boolean {
  if (input.isMutationPending) return true;

  if (
    input.tasks.some(
      (task) => task.status === 'pending' || task.status === 'running',
    )
  ) {
    return true;
  }

  return input.items.some(
    (item) => item.type === 'generation-turn' && Boolean(item.isGenerating),
  );
}
