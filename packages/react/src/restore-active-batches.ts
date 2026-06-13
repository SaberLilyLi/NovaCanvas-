import type { ConversationMessage, ConversationState, GenerationTask } from '@novacanvas/types';
import type { ActiveGenerationBatch } from './build-conversation-items';
import type { BatchSessionMeta } from './conversation-session';
import { isBatchRenderedInHistory } from './generation-slots';

function resolveGroupPrompt(messages: ConversationMessage[], tasks: GenerationTask[]): string {
  const taskIds = new Set(tasks.map((task) => task.id));

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]!;
    if (message.role !== 'assistant' || !message.taskIds?.some((taskId) => taskIds.has(taskId))) {
      continue;
    }

    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const previous = messages[cursor]!;
      if (previous.role === 'user') return previous.content;
      if (previous.role === 'assistant' && previous.content.includes('已拆分为')) continue;
    }
  }

  return tasks[0]?.prompt ?? '';
}

function shouldRestoreGroup(
  groupTasks: GenerationTask[],
  messages: ConversationMessage[],
): boolean {
  const hasInFlight = groupTasks.some(
    (task) => task.status === 'pending' || task.status === 'running',
  );
  if (hasInFlight) return true;

  const taskIds = groupTasks.map((task) => task.id);
  return !isBatchRenderedInHistory(taskIds, groupTasks, messages);
}

export function restoreActiveBatchesFromConversation(
  conversation: ConversationState,
  sessionMeta?: {
    imageSize?: BatchSessionMeta;
    batchMetaByGroupId?: Record<string, BatchSessionMeta>;
  },
): ActiveGenerationBatch[] {
  const tasksByGroup = new Map<string, GenerationTask[]>();

  for (const task of conversation.tasks) {
    if (!task.resultGroupId) continue;
    const group = tasksByGroup.get(task.resultGroupId) ?? [];
    group.push(task);
    tasksByGroup.set(task.resultGroupId, group);
  }

  const batches: ActiveGenerationBatch[] = [];

  for (const [groupId, groupTasks] of tasksByGroup) {
    const sorted = [...groupTasks].sort(
      (left, right) => (left.imageIndex ?? 0) - (right.imageIndex ?? 0),
    );
    if (!shouldRestoreGroup(sorted, conversation.messages)) continue;

    const batchMeta =
      sessionMeta?.batchMetaByGroupId?.[groupId] ?? sessionMeta?.imageSize;

    batches.push({
      id: groupId,
      taskIds: sorted.map((task) => task.id),
      prompt: batchMeta?.prompt ?? resolveGroupPrompt(conversation.messages, sorted),
      ratioLabel: batchMeta?.ratioLabel,
      resolution: batchMeta?.resolution,
    });
  }

  return batches.sort((left, right) => {
    const leftCreatedAt = conversation.tasks.find((task) => task.id === left.taskIds[0])?.createdAt;
    const rightCreatedAt = conversation.tasks.find((task) => task.id === right.taskIds[0])
      ?.createdAt;
    return String(leftCreatedAt ?? '').localeCompare(String(rightCreatedAt ?? ''));
  });
}
