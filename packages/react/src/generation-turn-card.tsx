import type { ReactNode } from 'react';
import { formatGenerationHeader } from './generation-meta';
import type { ResolutionTier } from './image-size-settings';

export interface GenerationTurnCardProps {
  prompt: string;
  ratioLabel: string;
  resolution?: ResolutionTier;
  actionLabel?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function GenerationTurnCard(props: GenerationTurnCardProps) {
  return (
    <article className="nova-generation-turn">
      <header className="nova-generation-turn__header">
        {formatGenerationHeader(
          props.prompt,
          props.ratioLabel,
          props.resolution ?? '1k',
          props.actionLabel,
        )}
      </header>
      <div className="nova-generation-turn__body">{props.children}</div>
      {props.footer ? <div className="nova-generation-turn__footer">{props.footer}</div> : null}
    </article>
  );
}
