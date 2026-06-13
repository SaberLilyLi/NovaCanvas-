import { ArrowDownRight } from 'lucide-react';
import type { PromptSuggestion } from '@novacanvas/types';

export interface GenerationSuggestionsBarProps {
  suggestions: PromptSuggestion[];
  disabled?: boolean;
  onSelect: (prompt: string) => void;
}

export function GenerationSuggestionsBar(props: GenerationSuggestionsBarProps) {
  if (props.suggestions.length === 0) return null;

  return (
    <div className="nova-generation-suggestions">
      <span className="nova-generation-suggestions__label">你可以试试这样改：</span>
      <div className="nova-generation-suggestions__list">
        {props.suggestions.map((suggestion) => (
          <button
            key={suggestion.title}
            type="button"
            className="nova-generation-suggestions__item"
            disabled={props.disabled}
            onClick={() => props.onSelect(suggestion.prompt)}
          >
            <span>{suggestion.title}</span>
            <ArrowDownRight size={14} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
