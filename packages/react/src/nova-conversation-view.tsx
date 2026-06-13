import type { Message } from '@company/ai-studio-sdk/types';
import type { GeneratedImage, PromptSuggestion } from '@novacanvas/types';
import { GenerationSlotGrid } from './generation-slot-grid';
import { GenerationTurnCard } from './generation-turn-card';
import { GenerationTurnFooter } from './generation-turn-footer';
import type { ResolutionTier } from './image-size-settings';
import type { GenerationSlot } from './generation-slots';

export type NovaConversationItem =
  | { type: 'sdk'; message: Message }
  | {
      type: 'generation-turn';
      id: string;
      prompt: string;
      ratioLabel?: string;
      resolution?: ResolutionTier;
      slots?: GenerationSlot[];
      images?: GeneratedImage[];
      isGenerating?: boolean;
      actionType?: 'regenerate' | 'refine' | 'create';
      lastUserPrompt?: string;
      suggestions?: PromptSuggestion[];
    }
  | {
      type: 'generation-batch';
      batchId: string;
      prompt: string;
      ratioLabel?: string;
      resolution?: ResolutionTier;
      slots: GenerationSlot[];
      actionType?: 'regenerate' | 'refine' | 'create';
      lastUserPrompt?: string;
      suggestions?: PromptSuggestion[];
    };

export interface NovaConversationViewProps {
  items: NovaConversationItem[];
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  loadingSuggestionTurnIds?: string[];
  isInteractionLocked?: boolean;
  onTurnContinueEdit?: (turnPrompt: string) => void;
  onTurnRegenerate?: (turnPrompt: string, slotCount: number) => void;
  onSuggestionSelect?: (prompt: string) => void;
}

function resolveActionLabel(actionType?: 'regenerate' | 'refine' | 'create'): string | undefined {
  if (actionType === 'regenerate') return '重新生成';
  if (actionType === 'refine') return '细节修复';
  return undefined;
}

function SdkMessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="nova-conversation-item nova-conversation-item--system">
        <p>{message.content}</p>
      </div>
    );
  }

  return (
    <article
      className={`nova-conversation-item nova-conversation-item--${message.role}`}
    >
      {!isUser && (
        <div className="nova-conversation-item__avatar" aria-hidden>
          AI
        </div>
      )}
      <div className="nova-conversation-item__body">
        {!isUser && message.content && (
          <div className="nova-conversation-item__label">
            <span>Assistant</span>
            {message.status === 'streaming' && <span>生成中</span>}
            {message.status === 'error' && <span className="is-error">失败</span>}
          </div>
        )}
        {message.content ? <p>{message.content}</p> : null}
      </div>
      {isUser && (
        <div className="nova-conversation-item__avatar is-user" aria-hidden>
          你
        </div>
      )}
    </article>
  );
}

function GenerationTurnView(props: {
  item: Extract<NovaConversationItem, { type: 'generation-turn' }>;
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  loadingSuggestions?: boolean;
  isInteractionLocked?: boolean;
  onTurnContinueEdit?: (turnPrompt: string) => void;
  onTurnRegenerate?: (turnPrompt: string, slotCount: number) => void;
  onSuggestionSelect?: (prompt: string) => void;
}) {
  const { item } = props;
  const turnPrompt = item.lastUserPrompt ?? item.prompt;
  const slotCount = item.slots?.length ?? 1;
  const hasCompletedImages = Boolean(item.slots?.some((slot) => slot.image));

  return (
    <GenerationTurnCard
      prompt={turnPrompt}
      actionLabel={resolveActionLabel(item.actionType)}
      ratioLabel={item.ratioLabel ?? '1:1'}
      resolution={item.resolution}
      footer={
        hasCompletedImages || props.loadingSuggestions ? (
          <GenerationTurnFooter
            turnPrompt={turnPrompt}
            slotCount={slotCount}
            suggestions={item.suggestions}
            loadingSuggestions={props.loadingSuggestions}
            isGenerating={item.isGenerating}
            isInteractionLocked={props.isInteractionLocked}
            enableImageEdit={props.enableImageEdit}
            onContinueEdit={props.onTurnContinueEdit}
            onRegenerate={props.onTurnRegenerate}
            onSuggestionSelect={props.onSuggestionSelect}
          />
        ) : null
      }
    >
      {item.slots ? (
        <GenerationSlotGrid
          slots={item.slots}
          isGenerating={item.isGenerating}
          enableDownload={props.enableDownload}
        />
      ) : null}
    </GenerationTurnCard>
  );
}

export function NovaConversationView(props: NovaConversationViewProps) {
  if (props.items.length === 0) return null;

  return (
    <div className="nova-conversation-view">
      {props.items.map((item) => {
        if (item.type === 'generation-turn') {
          return (
            <GenerationTurnView
              key={item.id}
              item={item}
              enableImageEdit={props.enableImageEdit}
              enableDownload={props.enableDownload}
              loadingSuggestions={props.loadingSuggestionTurnIds?.includes(item.id)}
              isInteractionLocked={props.isInteractionLocked}
              onTurnContinueEdit={props.onTurnContinueEdit}
              onTurnRegenerate={props.onTurnRegenerate}
              onSuggestionSelect={props.onSuggestionSelect}
            />
          );
        }

        if (item.type === 'sdk') {
          return <SdkMessageBubble key={item.message.id} message={item.message} />;
        }

        return null;
      })}
    </div>
  );
}
