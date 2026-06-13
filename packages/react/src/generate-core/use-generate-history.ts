import { useMemo } from 'react';
import type { BizType, GeneratedImage } from '@novacanvas/types';
import type { NovaCanvasClient } from '@novacanvas/sdk';
import {
  buildConversationItems,
  type ActiveGenerationBatch,
  type TurnMeta,
} from '../build-conversation-items';
import type { ResolutionTier } from '../image-size-settings';
import type { NovaConversationItem } from '../nova-conversation-view';
import { useTurnSuggestions } from '../use-turn-suggestions';

export interface UseGenerateHistoryOptions {
  client: NovaCanvasClient;
  bizType: BizType;
  sceneType?: string;
  model?: string;
  messages: Parameters<typeof buildConversationItems>[0]['messages'];
  images: GeneratedImage[];
  tasks: Parameters<typeof buildConversationItems>[0]['tasks'];
  activeBatches: ActiveGenerationBatch[];
  turnMetaById: Record<string, TurnMeta>;
  ratioLabel: string;
  resolution: ResolutionTier;
  onTurnMetaChange: (
    updater: (current: Record<string, TurnMeta>) => Record<string, TurnMeta>,
  ) => void;
}

export interface UseGenerateHistoryResult {
  items: NovaConversationItem[];
  loadingTurnIds: string[];
}

export function useGenerateHistory(
  options: UseGenerateHistoryOptions,
): UseGenerateHistoryResult {
  const items = useMemo(
    () =>
      buildConversationItems({
        messages: options.messages,
        images: options.images,
        tasks: options.tasks,
        activeBatches: options.activeBatches,
        turnMetaById: options.turnMetaById,
        ratioLabel: options.ratioLabel,
        resolution: options.resolution,
      }),
    [
      options.activeBatches,
      options.images,
      options.messages,
      options.ratioLabel,
      options.resolution,
      options.tasks,
      options.turnMetaById,
    ],
  );

  const { loadingTurnIds } = useTurnSuggestions({
    client: options.client,
    bizType: options.bizType,
    sceneType: options.sceneType,
    model: options.model,
    items,
    turnMetaById: options.turnMetaById,
    onTurnMetaChange: options.onTurnMetaChange,
  });

  return {
    items,
    loadingTurnIds,
  };
}
