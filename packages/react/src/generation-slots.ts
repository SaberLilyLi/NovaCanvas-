import type { GeneratedImage, GenerationTask } from '@novacanvas/types';

export interface GenerationSlot {
  index: number;
  taskId: string;
  status: GenerationTask['status'];
  progress: number;
  image?: GeneratedImage;
  errorMessage?: string;
}

export function buildGenerationSlots(
  batchTaskIds: string[],
  tasks: GenerationTask[],
  images: GeneratedImage[],
): GenerationSlot[] {
  const slots = batchTaskIds.map((taskId, index) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) {
      return {
        index: index + 1,
        taskId,
        status: 'pending' as const,
        progress: 0,
      };
    }

    const image =
      task.resultImage ??
      (task.resultImageId
        ? images.find((item) => item.id === task.resultImageId)
        : undefined);

    return {
      index: task.imageIndex ?? index + 1,
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      image,
      errorMessage: task.errorMessage,
    };
  });

  return [...slots].sort((left, right) => left.index - right.index);
}

export function isBatchComplete(slots: GenerationSlot[]): boolean {
  return (
    slots.length > 0 &&
    slots.every((slot) => slot.status === 'success' || slot.status === 'failed')
  );
}

export function isBatchRenderedInHistory(
  batchTaskIds: string[],
  tasks: GenerationTask[],
  messages: { imageIds?: string[] }[],
): boolean {
  const batchTasks = batchTaskIds
    .map((taskId) => tasks.find((task) => task.id === taskId))
    .filter((task): task is GenerationTask => Boolean(task));

  const successTasks = batchTasks.filter((task) => task.status === 'success');
  if (successTasks.length === 0) return false;

  const resultImageIds = successTasks
    .map((task) => task.resultImageId)
    .filter((id): id is string => Boolean(id));

  if (resultImageIds.length !== successTasks.length) return false;

  const messageImageIds = new Set(messages.flatMap((message) => message.imageIds ?? []));
  return resultImageIds.every((id) => messageImageIds.has(id));
}

export function isBatchRenderedInImages(
  batchTaskIds: string[],
  tasks: GenerationTask[],
  images: GeneratedImage[],
): boolean {
  const batchTasks = batchTaskIds
    .map((taskId) => tasks.find((task) => task.id === taskId))
    .filter((task): task is GenerationTask => Boolean(task));

  const successTasks = batchTasks.filter((task) => task.status === 'success');
  if (successTasks.length === 0) return false;

  return successTasks.every((task) => {
    const imageId = task.resultImageId;
    if (!imageId) return false;
    return images.some((image) => image.id === imageId);
  });
}
