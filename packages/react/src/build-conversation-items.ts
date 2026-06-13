import type {
  ConversationMessage,
  GeneratedImage,
  GenerationTask,
  PromptSuggestion,
} from '@novacanvas/types';
import type { ConversationViewMessage } from './conversation/types';
import { IMAGE_OPTIMIZE_PROMPT } from './generation-image-actions';
import {
  buildGenerationSlots,
  isBatchComplete,
  isBatchRenderedInHistory,
} from './generation-slots';
import type { ResolutionTier } from './image-size-settings';
import type { NovaConversationItem } from './nova-conversation-view';
import { isRegenerateUserMessage, resolveLastUserPrompt } from './resolve-last-user-prompt';

export interface TurnMeta {
  actionType?: 'regenerate' | 'refine' | 'create';
  lastUserPrompt?: string;
  suggestions?: PromptSuggestion[];
}

export interface ActiveGenerationBatch {
  id: string;
  taskIds: string[];
  prompt: string;
  generationModel?: string;
  ratioLabel?: string;
  resolution?: ResolutionTier;
  actionType?: 'regenerate' | 'refine' | 'create';
  lastUserPrompt?: string;
  suggestions?: PromptSuggestion[];
}

function isRefineUserMessage(content: string): boolean {
  return content.trim() === IMAGE_OPTIMIZE_PROMPT;
}

export interface BuildConversationItemsOptions {
  messages: ConversationMessage[];
  images: GeneratedImage[];
  tasks: GenerationTask[];
  activeBatches: ActiveGenerationBatch[];
  turnMetaById: Record<string, TurnMeta>;
  ratioLabel: string;
  resolution: ResolutionTier;
}

function isSplitHintMessage(message: ConversationMessage): boolean {
  return message.role === 'assistant' && message.content.includes('已拆分为');
}

function findUserPrompt(messages: ConversationMessage[], fromIndex: number): string {
  for (let index = fromIndex - 1; index >= 0; index -= 1) {
    const message = messages[index]!;
    if (message.role === 'user') return message.content;
    if (isSplitHintMessage(message)) continue;
  }
  return '';
}

function resolveTurnMeta(
  groupId: string,
  messages: ConversationMessage[],
  fromIndex: number,
  turnMetaById: Record<string, TurnMeta>,
): TurnMeta {
  const cached = turnMetaById[groupId];
  if (cached) return cached;

  const userPrompt = findUserPrompt(messages, fromIndex);
  if (isRegenerateUserMessage(userPrompt)) {
    return {
      actionType: 'regenerate',
      lastUserPrompt: resolveLastUserPrompt(messages.slice(0, fromIndex)),
    };
  }

  if (isRefineUserMessage(userPrompt)) {
    return {
      actionType: 'refine',
      lastUserPrompt: resolveLastUserPrompt(messages.slice(0, fromIndex)),
    };
  }

  return {
    actionType: 'create',
    lastUserPrompt: userPrompt,
  };
}

function isResultGroupStillActive(
  groupId: string,
  tasks: GenerationTask[],
  activeBatches: ActiveGenerationBatch[],
  images: GeneratedImage[],
  messages: ConversationMessage[],
): boolean {
  if (
    tasks.some(
      (task) =>
        task.resultGroupId === groupId &&
        (task.status === 'pending' || task.status === 'running'),
    )
  ) {
    return true;
  }

  return activeBatches.some((batch) => {
    if (batch.id !== groupId) return false;

    const slots = buildGenerationSlots(batch.taskIds, tasks, images);
    if (!isBatchComplete(slots)) return true;

    return !isBatchRenderedInHistory(batch.taskIds, tasks, messages);
  });
}

function buildSlotsForResultGroup(
  groupId: string,
  groupImages: GeneratedImage[],
  tasks: GenerationTask[],
  images: GeneratedImage[],
): ReturnType<typeof buildGenerationSlots> {
  const groupTasks = tasks
    .filter((task) => task.resultGroupId === groupId)
    .sort((a, b) => (a.imageIndex ?? 0) - (b.imageIndex ?? 0));

  if (groupTasks.length > 0) {
    return buildGenerationSlots(
      groupTasks.map((task) => task.id),
      tasks,
      images,
    );
  }

  return groupImages.map((image, index) => ({
    index: image.imageIndex ?? index + 1,
    taskId: `legacy-${image.id}`,
    status: 'success' as const,
    progress: 100,
    image,
  }));
}

function buildHistoryItems(
  messages: ConversationMessage[],
  images: GeneratedImage[],
  tasks: GenerationTask[],
  activeBatches: ActiveGenerationBatch[],
  turnMetaById: Record<string, TurnMeta>,
  meta: { ratioLabel: string; resolution: ResolutionTier },
): NovaConversationItem[] {
  const items: NovaConversationItem[] = [];
  const shownGroups = new Set<string>();

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]!;

    if (isSplitHintMessage(message)) {
      continue;
    }

    if (message.role === 'assistant' && message.imageIds?.length) {
      const firstImage = images.find((item) => item.id === message.imageIds?.[0]);
      const groupId =
        message.resultGroupId ?? firstImage?.resultGroupId ?? `legacy-${message.id}`;
      if (shownGroups.has(groupId)) continue;

      const groupImages = images
        .filter(
          (item) =>
            (item.resultGroupId && item.resultGroupId === groupId) ||
            message.imageIds!.includes(item.id),
        )
        .sort((a, b) => (a.imageIndex ?? 0) - (b.imageIndex ?? 0));

      if (
        isResultGroupStillActive(groupId, tasks, activeBatches, images, messages)
      ) {
        continue;
      }
      shownGroups.add(groupId);

      if (groupImages.length > 0) {
        const turnMeta = resolveTurnMeta(groupId, messages, index, turnMetaById);
        const prompt =
          turnMeta.lastUserPrompt ||
          findUserPrompt(messages, index) ||
          groupImages[0]?.prompt ||
          message.content;

        items.push({
          type: 'generation-turn',
          id: groupId,
          prompt,
          generationModel: undefined,
          ratioLabel: meta.ratioLabel,
          resolution: meta.resolution,
          slots: buildSlotsForResultGroup(groupId, groupImages, tasks, images),
          actionType: turnMeta.actionType,
          lastUserPrompt: turnMeta.lastUserPrompt,
          suggestions: turnMeta.suggestions,
        });
      }
      continue;
    }

    if (message.role === 'user') {
      const next = messages[index + 1];
      if (next?.role === 'assistant' && next.imageIds?.length) {
        continue;
      }

      items.push({
        type: 'message',
        message: {
          id: message.id,
          role: 'user',
          content: message.content,
          createdAt: new Date(message.createdAt).getTime(),
          status: 'success',
        } satisfies ConversationViewMessage,
      });
      continue;
    }

    if (message.role === 'assistant' && message.content && !message.taskIds?.length) {
      items.push({
        type: 'message',
        message: {
          id: message.id,
          role: 'assistant',
          content: message.content,
          createdAt: new Date(message.createdAt).getTime(),
          status: 'success',
        } satisfies ConversationViewMessage,
      });
    }
  }

  return items;
}

function buildTurnFingerprint(
  item: Extract<NovaConversationItem, { type: 'generation-turn' }>,
): string {
  const imageIds = (item.slots ?? [])
    .map((slot) => slot.image?.id)
    .filter((id): id is string => Boolean(id))
    .sort();

  if (imageIds.length > 0) {
    return `image:${imageIds.join('|')}`;
  }

  const taskIds = (item.slots ?? [])
    .map((slot) => slot.taskId)
    .filter((taskId) => !taskId.startsWith('legacy-'))
    .sort();

  if (taskIds.length > 0) {
    return `task:${taskIds.join('|')}`;
  }

  return `id:${item.id}`;
}

function dedupeGenerationTurns(items: NovaConversationItem[]): NovaConversationItem[] {
  const seen = new Set<string>();
  const deduped: NovaConversationItem[] = [];

  for (const item of items) {
    if (item.type !== 'generation-turn') {
      deduped.push(item);
      continue;
    }

    const fingerprint = buildTurnFingerprint(item);
    if (seen.has(fingerprint)) continue;

    seen.add(fingerprint);
    deduped.push(item);
  }

  return deduped;
}

function mergeUserWithGenerationBatch(items: NovaConversationItem[]): NovaConversationItem[] {
  const merged: NovaConversationItem[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const current = items[index]!;
    const next = items[index + 1];

    if (
      current.type === 'message' &&
      current.message.role === 'user' &&
      next?.type === 'generation-batch'
    ) {
      const userMessage = current.message;
      const isGenerating = !isBatchComplete(next.slots);
      merged.push({
        type: 'generation-turn',
        id: next.batchId,
        prompt: next.lastUserPrompt || next.prompt || userMessage.content,
        generationModel: next.generationModel,
        ratioLabel: next.ratioLabel,
        resolution: next.resolution,
        slots: next.slots,
        isGenerating,
        actionType: next.actionType,
        lastUserPrompt: next.lastUserPrompt,
        suggestions: next.suggestions,
      });
      index += 1;
      continue;
    }

    merged.push(current);
  }

  return merged;
}

export function buildConversationItems(
  input: BuildConversationItemsOptions,
): NovaConversationItem[] {
  const meta = { ratioLabel: input.ratioLabel, resolution: input.resolution };
  const items = buildHistoryItems(
    input.messages,
    input.images,
    input.tasks,
    input.activeBatches,
    input.turnMetaById,
    meta,
  );

  for (const batch of input.activeBatches) {
    const slots = buildGenerationSlots(batch.taskIds, input.tasks, input.images);
    if (slots.length === 0) continue;

    const complete = isBatchComplete(slots);
    const renderedInHistory = isBatchRenderedInHistory(
      batch.taskIds,
      input.tasks,
      input.messages,
    );

    if (complete && renderedInHistory) continue;

    items.push({
      type: 'generation-batch',
      batchId: batch.id,
      prompt: batch.lastUserPrompt || batch.prompt,
      generationModel: batch.generationModel,
      ratioLabel: batch.ratioLabel ?? input.ratioLabel,
      resolution: batch.resolution ?? input.resolution,
      slots,
      actionType: batch.actionType,
      lastUserPrompt: batch.lastUserPrompt,
      suggestions: batch.suggestions,
    });
  }

  const merged = mergeUserWithGenerationBatch(items);

  const turns = merged.map((item) => {
    if (item.type !== 'generation-batch') return item;

    return {
      type: 'generation-turn' as const,
      id: item.batchId,
      prompt: item.prompt,
      generationModel: item.generationModel,
      ratioLabel: item.ratioLabel,
      resolution: item.resolution,
      slots: item.slots,
      isGenerating: !isBatchComplete(item.slots),
      actionType: item.actionType,
      lastUserPrompt: item.lastUserPrompt,
      suggestions: item.suggestions,
    };
  });

  return dedupeGenerationTurns(turns);
}
