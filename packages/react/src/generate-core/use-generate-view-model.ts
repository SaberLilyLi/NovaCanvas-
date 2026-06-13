import { useEffect, useMemo, useRef, useState } from 'react';
import type { BizType, ConversationState, GeneratedImage } from '@novacanvas/types';
import type { ActiveGenerationBatch, TurnMeta } from '../build-conversation-items';
import {
  buildGenerationSlots,
  isBatchComplete,
  isBatchRenderedInHistory,
} from '../generation-slots';
import { restoreActiveBatchesFromConversation } from '../restore-active-batches';
import {
  saveBatchSessionMeta,
  type BatchSessionMeta,
} from '../conversation-session';

export interface UseGenerateViewModelOptions {
  bizType: BizType;
  sceneType?: string;
  userId?: string;
  conversation?: ConversationState;
  generatedImages: GeneratedImage[];
  sessionMeta?: {
    imageSize?: BatchSessionMeta;
    batchMetaByGroupId?: Record<string, BatchSessionMeta>;
  };
}

function areBatchListsEqual(left: ActiveGenerationBatch[], right: ActiveGenerationBatch[]) {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    if (JSON.stringify(left[index]) !== JSON.stringify(right[index])) {
      return false;
    }
  }

  return true;
}

function areTurnMetaEqual(
  left: Record<string, TurnMeta>,
  right: Record<string, TurnMeta>,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useGenerateViewModel(options: UseGenerateViewModelOptions) {
  const [activeBatches, setActiveBatches] = useState<ActiveGenerationBatch[]>([]);
  const [turnMetaById, setTurnMetaById] = useState<Record<string, TurnMeta>>({});
  const restoredSignatureRef = useRef<string>('');
  const activeBatchesRef = useRef<ActiveGenerationBatch[]>([]);
  const turnMetaRef = useRef<Record<string, TurnMeta>>({});

  useEffect(() => {
    activeBatchesRef.current = activeBatches;
  }, [activeBatches]);

  useEffect(() => {
    turnMetaRef.current = turnMetaById;
  }, [turnMetaById]);

  useEffect(() => {
    const conversation = options.conversation;
    if (!conversation) return;

    const restored = restoreActiveBatchesFromConversation(conversation, options.sessionMeta);
    const restoredSignature = JSON.stringify(restored);
    if (restoredSignatureRef.current === restoredSignature) return;

    restoredSignatureRef.current = restoredSignature;
    if (areBatchListsEqual(activeBatchesRef.current, restored)) return;
    setActiveBatches(restored);
  }, [options.conversation, options.sessionMeta]);

  useEffect(() => {
    const conversation = options.conversation;
    if (!conversation) return;

    const nextBatches: ActiveGenerationBatch[] = [];
    let nextMeta: Record<string, TurnMeta> | null = null;

    for (const batch of activeBatches) {
      const slots = buildGenerationSlots(
        batch.taskIds,
        conversation.tasks,
        options.generatedImages,
      );
      const complete = isBatchComplete(slots);
      const renderedInHistory = isBatchRenderedInHistory(
        batch.taskIds,
        conversation.tasks,
        conversation.messages,
      );

      if (
        complete &&
        renderedInHistory &&
        (batch.actionType === 'regenerate' || batch.actionType === 'refine')
      ) {
        const groupId = conversation.tasks.find((task) =>
          batch.taskIds.includes(task.id),
        )?.resultGroupId;

        if (groupId) {
          nextMeta = {
            ...(nextMeta ?? turnMetaRef.current),
            [groupId]: {
              actionType: batch.actionType,
              lastUserPrompt: batch.lastUserPrompt,
              suggestions: batch.suggestions,
            },
          };
        }
      }

      if (!complete || !renderedInHistory) {
        nextBatches.push(batch);
      }
    }

    if (!areBatchListsEqual(activeBatchesRef.current, nextBatches)) {
      setActiveBatches(nextBatches);
    }

    if (nextMeta) {
      if (!areTurnMetaEqual(turnMetaRef.current, nextMeta as Record<string, TurnMeta>)) {
        setTurnMetaById(nextMeta as Record<string, TurnMeta>);
      }
    }
  }, [activeBatches, options.conversation, options.generatedImages]);

  return useMemo(
    () => ({
      activeBatches,
      turnMetaById,
      setTurnMetaById,
      reset() {
        setActiveBatches([]);
        setTurnMetaById({});
      },
      addOptimisticBatch(batch: ActiveGenerationBatch) {
        setActiveBatches((batches) => [...batches, batch]);
      },
      removeBatch(batchId: string) {
        setActiveBatches((batches) => batches.filter((current) => current.id !== batchId));
      },
      patchBatch(
        batchId: string,
        updater: (batch: ActiveGenerationBatch) => ActiveGenerationBatch,
      ) {
        setActiveBatches((batches) =>
          batches.map((batch) => (batch.id === batchId ? updater(batch) : batch)),
        );
      },
      persistBatchMeta(groupId: string, meta: BatchSessionMeta, conversationId?: string) {
        if (!conversationId) return;

        saveBatchSessionMeta(options.bizType, groupId, meta, {
          conversationId,
          sceneType: options.sceneType,
          userId: options.userId,
        });
      },
    }),
    [activeBatches, options.bizType, options.sceneType, options.userId, turnMetaById],
  );
}
