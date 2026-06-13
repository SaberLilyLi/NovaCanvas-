import type {
  ConversationMessage,
  ConversationState,
  GenerationTask,
  TaskStatus,
  UploadedImage,
} from '@novacanvas/types';

const STATUS_RANK: Record<TaskStatus, number> = {
  pending: 0,
  running: 1,
  success: 3,
  failed: 3,
  cancelled: 3,
};

function mergeTask(local: GenerationTask | undefined, incoming: GenerationTask): GenerationTask {
  if (!local) return incoming;

  const localRank = STATUS_RANK[local.status] ?? 0;
  const incomingRank = STATUS_RANK[incoming.status] ?? 0;

  let merged: GenerationTask;
  if (localRank > incomingRank) {
    merged = { ...incoming, ...local };
  } else if (incomingRank > localRank) {
    merged = { ...local, ...incoming };
  } else {
    merged =
      local.progress >= incoming.progress
        ? { ...incoming, ...local }
        : { ...local, ...incoming };
  }

  if (local.resultImage && !merged.resultImage) {
    merged.resultImage = local.resultImage;
  }
  if (local.resultImageId && !merged.resultImageId) {
    merged.resultImageId = local.resultImageId;
  }

  return merged;
}

function mergeTasks(local: GenerationTask[], incoming: GenerationTask[]): GenerationTask[] {
  const localById = new Map(local.map((task) => [task.id, task]));
  const merged = incoming.map((task) => mergeTask(localById.get(task.id), task));

  for (const task of local) {
    if (!incoming.some((item) => item.id === task.id)) {
      merged.push(task);
    }
  }

  return merged;
}

function mergeImages(
  local: UploadedImage[],
  incoming: UploadedImage[],
): UploadedImage[] {
  const byId = new Map<string, UploadedImage>();

  for (const image of incoming) {
    byId.set(image.id, image);
  }

  for (const image of local) {
    if (!byId.has(image.id)) {
      byId.set(image.id, image);
    }
  }

  return Array.from(byId.values());
}

function mergeMessages(
  local: ConversationMessage[],
  incoming: ConversationMessage[],
): ConversationMessage[] {
  const incomingIds = new Set(incoming.map((message) => message.id));
  const optimistic = local.filter(
    (message) => message.id.startsWith('optimistic-') && !incomingIds.has(message.id),
  );

  const dedupedOptimistic = optimistic.filter((message) => {
    if (message.role !== 'user') return true;
    return !incoming.some(
      (item) => item.role === 'user' && item.content === message.content,
    );
  });

  return [...incoming, ...dedupedOptimistic];
}

export function mergeConversationState(
  local: ConversationState,
  incoming: ConversationState,
): ConversationState {
  return {
    ...incoming,
    messages: mergeMessages(local.messages, incoming.messages),
    images: mergeImages(local.images, incoming.images),
    tasks: mergeTasks(local.tasks, incoming.tasks),
    latestImageId: incoming.latestImageId ?? local.latestImageId,
    selectedImageId: incoming.selectedImageId ?? local.selectedImageId,
    latestResultGroupId: incoming.latestResultGroupId ?? local.latestResultGroupId,
  };
}
