import type { GenerationTask } from '@novacanvas/types';
import type { ActiveGenerationBatch } from './build-conversation-items';
import type { ResolutionTier } from './image-size-settings';

export function createOptimisticBatch(input: {
  batchId: string;
  count: number;
  prompt: string;
  ratioLabel: string;
  resolution: ResolutionTier;
  inputImageIds?: string[];
}): { batch: ActiveGenerationBatch; tasks: GenerationTask[] } {
  const taskIds = Array.from(
    { length: input.count },
    (_, index) => `pending-${input.batchId}-${index + 1}`,
  );
  const hasReferences = Boolean(input.inputImageIds?.length);

  return {
    batch: {
      id: input.batchId,
      taskIds,
      prompt: input.prompt,
      ratioLabel: input.ratioLabel,
      resolution: input.resolution,
    },
    tasks: taskIds.map(
      (taskId, index): GenerationTask => ({
        id: taskId,
        status: 'pending',
        progress: 0,
        taskType: hasReferences ? 'text_image_to_image' : 'text_to_image',
        prompt: input.prompt,
        inputImageIds: input.inputImageIds ?? [],
        resultGroupId: input.batchId,
        imageIndex: index + 1,
      }),
    ),
  };
}

export function isPendingTaskId(taskId: string): boolean {
  return taskId.startsWith('pending-');
}
