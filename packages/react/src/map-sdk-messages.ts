import type { Message } from '@company/ai-studio-sdk/types';
import type { ConversationMessage, GeneratedImage } from '@novacanvas/types';

export function mapNovaCanvasToSdkMessages(
  messages: ConversationMessage[],
  images: GeneratedImage[],
): Message[] {
  const items: Message[] = [];
  const shownGroups = new Set<string>();

  for (const message of messages) {
    if (message.role === 'assistant' && message.content.includes('已拆分为')) {
      continue;
    }

    if (message.role === 'assistant' && message.imageIds?.length) {
      const firstImage = images.find((item) => item.id === message.imageIds?.[0]);
      const groupId =
        message.resultGroupId ?? firstImage?.resultGroupId ?? `legacy-${message.id}`;
      if (shownGroups.has(groupId)) continue;
      shownGroups.add(groupId);

      const groupImages = images
        .filter(
          (item) =>
            (item.resultGroupId && item.resultGroupId === groupId) ||
            message.imageIds!.includes(item.id),
        )
        .sort((a, b) => (a.imageIndex ?? 0) - (b.imageIndex ?? 0));

      if (groupImages.length > 0) {
        items.push({
          id: groupId,
          role: 'assistant',
          content: '',
          createdAt: new Date(message.createdAt).getTime(),
          status: 'success',
          attachments: groupImages.map((image) => ({
            id: image.id,
            type: 'image' as const,
            url: image.url,
            name: image.imageIndex ? `第 ${image.imageIndex} 张` : '生成结果',
            mimeType: 'image/png',
          })),
        });
      }
      continue;
    }

    if (message.role === 'user') {
      items.push({
        id: message.id,
        role: 'user',
        content: message.content,
        createdAt: new Date(message.createdAt).getTime(),
        status: 'success',
      });
      continue;
    }

    if (message.role === 'assistant' && message.content && !message.taskIds?.length) {
      items.push({
        id: message.id,
        role: 'assistant',
        content: message.content,
        createdAt: new Date(message.createdAt).getTime(),
        status: 'success',
      });
    }
  }

  return items;
}
