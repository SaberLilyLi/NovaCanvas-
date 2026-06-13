import type { BizType } from '@novacanvas/types';
import type { NovaCanvasClient } from '@novacanvas/sdk';
import { useEffect, useRef, useState } from 'react';
import type { TurnMeta } from './build-conversation-items';
import type { NovaConversationItem } from './nova-conversation-view';

export function useTurnSuggestions(input: {
  client: NovaCanvasClient;
  bizType: BizType;
  sceneType?: string;
  items: NovaConversationItem[];
  turnMetaById: Record<string, TurnMeta>;
  onTurnMetaChange: (
    updater: (current: Record<string, TurnMeta>) => Record<string, TurnMeta>,
  ) => void;
}) {
  const [loadingTurnIds, setLoadingTurnIds] = useState<string[]>([]);
  const requestedRef = useRef(new Set<string>());

  useEffect(() => {
    const completedTurns = input.items.filter(
      (item): item is Extract<NovaConversationItem, { type: 'generation-turn' }> =>
        item.type === 'generation-turn' &&
        !item.isGenerating &&
        Boolean(item.slots?.some((slot) => slot.image)),
    );

    for (const turn of completedTurns) {
      const turnPrompt = (turn.lastUserPrompt ?? turn.prompt).trim();
      if (!turnPrompt) continue;

      const cached = input.turnMetaById[turn.id];
      if (cached?.suggestions?.length) continue;
      if (requestedRef.current.has(turn.id)) continue;

      requestedRef.current.add(turn.id);
      setLoadingTurnIds((current) =>
        current.includes(turn.id) ? current : [...current, turn.id],
      );

      void input.client
        .getPromptSuggestions({
          bizType: input.bizType,
          sceneType: input.sceneType,
          lastUserPrompt: turnPrompt,
        })
        .then((result) => {
          input.onTurnMetaChange((meta) => ({
            ...meta,
            [turn.id]: {
              ...meta[turn.id],
              lastUserPrompt: turnPrompt,
              suggestions: result.suggestions,
            },
          }));
        })
        .catch(() => {
          requestedRef.current.delete(turn.id);
        })
        .finally(() => {
          setLoadingTurnIds((current) => current.filter((id) => id !== turn.id));
        });
    }
  }, [input.bizType, input.client, input.items, input.onTurnMetaChange, input.sceneType, input.turnMetaById]);

  return { loadingTurnIds };
}
