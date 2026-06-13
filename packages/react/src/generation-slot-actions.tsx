import type { GeneratedImage } from '@novacanvas/types';
import { PenLine, RefreshCw } from 'lucide-react';
import type { GenerationImageActionHandler } from './generation-image-actions';

export interface GenerationSlotActionsProps {
  image: GeneratedImage;
  turnPrompt: string;
  enableImageEdit?: boolean;
  onContinueEdit?: GenerationImageActionHandler;
  onRegenerate?: GenerationImageActionHandler;
}

export function GenerationSlotActions(props: GenerationSlotActionsProps) {
  if (!props.onContinueEdit && !props.onRegenerate) return null;

  const context = { turnPrompt: props.turnPrompt };

  return (
    <div className="nova-generation-actions">
      {props.enableImageEdit !== false && props.onContinueEdit && (
        <button
          type="button"
          className="nova-generation-actions__button"
          onClick={() => props.onContinueEdit?.(props.image, context)}
        >
          <PenLine size={14} />
          重新编辑
        </button>
      )}
      {props.onRegenerate && (
        <button
          type="button"
          className="nova-generation-actions__button"
          onClick={() => props.onRegenerate?.(props.image, context)}
        >
          <RefreshCw size={14} />
          再次生成
        </button>
      )}
    </div>
  );
}
