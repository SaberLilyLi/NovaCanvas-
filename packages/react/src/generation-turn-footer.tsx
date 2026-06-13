import { PenLine, RefreshCw } from 'lucide-react';
import type { PromptSuggestion } from '@novacanvas/types';
import { GenerationSuggestionsBar } from './generation-suggestions-bar';

export interface GenerationTurnFooterProps {
  turnPrompt: string;
  slotCount: number;
  suggestions?: PromptSuggestion[];
  loadingSuggestions?: boolean;
  isGenerating?: boolean;
  isInteractionLocked?: boolean;
  enableImageEdit?: boolean;
  onContinueEdit?: (turnPrompt: string) => void;
  onRegenerate?: (turnPrompt: string, slotCount: number) => void;
  onSuggestionSelect?: (prompt: string) => void;
}

export function GenerationTurnFooter(props: GenerationTurnFooterProps) {
  if (props.isGenerating) return null;

  const disabled = Boolean(props.isInteractionLocked);
  const showSuggestions = Boolean(props.suggestions?.length);
  const showActions = props.onContinueEdit || props.onRegenerate;

  if (!showSuggestions && !showActions) return null;

  return (
    <div
      className={[
        'nova-generation-turn-footer',
        disabled ? 'nova-generation-turn-footer--locked' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showSuggestions && (
        <div className="nova-generation-turn-footer__suggestions">
          <GenerationSuggestionsBar
            suggestions={props.suggestions ?? []}
            disabled={disabled}
            onSelect={(prompt) => props.onSuggestionSelect?.(prompt)}
          />
        </div>
      )}
      {showActions && (
        <div className="nova-generation-turn-footer__actions">
          {props.enableImageEdit !== false && props.onContinueEdit && (
            <button
              type="button"
              className="nova-generation-turn-footer__button"
              disabled={disabled}
              onClick={() => props.onContinueEdit?.(props.turnPrompt)}
            >
              <PenLine size={14} />
              重新编辑
            </button>
          )}
          {props.onRegenerate && (
            <button
              type="button"
              className="nova-generation-turn-footer__button"
              disabled={disabled}
              onClick={() => props.onRegenerate?.(props.turnPrompt, props.slotCount)}
            >
              <RefreshCw size={14} />
              再次生成
            </button>
          )}
        </div>
      )}
    </div>
  );
}
