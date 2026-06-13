import type { GeneratedImage, PromptSuggestion } from '@novacanvas/types';
import type { ConversationViewMessage } from './conversation/types';
import type { GenerationImageActionHandler } from './generation-image-actions';
import { GenerationSlotGrid } from './generation-slot-grid';
import { GenerationTurnCard } from './generation-turn-card';
import { GenerationTurnFooter } from './generation-turn-footer';
import type { ResolutionTier } from './image-size-settings';
import type { GenerationSlot } from './generation-slots';

export type NovaConversationItem =
  | { type: 'message'; message: ConversationViewMessage }
  | {
      type: 'generation-turn';
      id: string;
      prompt: string;
      generationModel?: string;
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
      generationModel?: string;
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
  selectedImageId?: string;
  onSelectImage?: (image: GeneratedImage) => void;
  onImageContinueEdit?: GenerationImageActionHandler;
  onTurnRegenerate?: (turnPrompt: string, slotCount: number) => void;
  onSuggestionSelect?: (prompt: string) => void;
}

function resolveActionLabel(actionType?: 'regenerate' | 'refine' | 'create'): string | undefined {
  if (actionType === 'regenerate') return 'Regenerate';
  if (actionType === 'refine') return 'Refine';
  return undefined;
}

function ConversationMessageBubble({ message }: { message: ConversationViewMessage }) {
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
    <article className={`nova-conversation-item nova-conversation-item--${message.role}`}>
      {!isUser && (
        <div className="nova-conversation-item__avatar" aria-hidden>
          AI
        </div>
      )}
      <div className="nova-conversation-item__body">
        {!isUser && message.content && (
          <div className="nova-conversation-item__label">
            <span>Assistant</span>
            {message.status === 'streaming' && <span>Generating</span>}
            {message.status === 'error' && <span className="is-error">Failed</span>}
          </div>
        )}
        {message.content ? <p>{message.content}</p> : null}
      </div>
    </article>
  );
}

function GenerationTurnView(props: {
  item: Extract<NovaConversationItem, { type: 'generation-turn' }>;
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  loadingSuggestions?: boolean;
  isInteractionLocked?: boolean;
  selectedImageId?: string;
  onSelectImage?: (image: GeneratedImage) => void;
  onImageContinueEdit?: GenerationImageActionHandler;
  onTurnRegenerate?: (turnPrompt: string, slotCount: number) => void;
  onSuggestionSelect?: (prompt: string) => void;
}) {
  const { item } = props;
  const turnPrompt = item.lastUserPrompt ?? item.prompt;
  const slotCount = item.slots?.length ?? 1;
  const hasCompletedImages = Boolean(item.slots?.some((slot) => slot.image));
  const shouldHoldCompletedContent =
    hasCompletedImages &&
    Boolean(props.loadingSuggestions) &&
    !item.suggestions?.length;
  const shouldShowCompletedFooter = hasCompletedImages && !shouldHoldCompletedContent;
  const completedImages =
    item.slots?.flatMap((slot) => (slot.image ? [slot.image] : [])) ?? [];
  const selectedImage = completedImages.find(
    (image) => image.id === props.selectedImageId,
  );
  const footerEditImage =
    completedImages.length === 1 ? completedImages[0] : selectedImage;

  return (
    <GenerationTurnCard
      prompt={turnPrompt}
      actionLabel={resolveActionLabel(item.actionType)}
      ratioLabel={item.ratioLabel ?? '1:1'}
      resolution={item.resolution}
      footer={
        shouldShowCompletedFooter ? (
          <GenerationTurnFooter
            turnPrompt={turnPrompt}
            slotCount={slotCount}
            suggestions={item.suggestions}
            loadingSuggestions={props.loadingSuggestions}
            isGenerating={item.isGenerating}
            isInteractionLocked={props.isInteractionLocked}
            enableImageEdit={props.enableImageEdit}
            onContinueEdit={
              footerEditImage && props.onImageContinueEdit
                ? () =>
                    props.onImageContinueEdit?.(footerEditImage, {
                      turnPrompt,
                      resultGroupId: item.id,
                      imageIndex: footerEditImage.imageIndex,
                    })
                : undefined
            }
            onRegenerate={props.onTurnRegenerate}
            onSuggestionSelect={props.onSuggestionSelect}
          />
        ) : null
      }
    >
      {shouldHoldCompletedContent ? (
        <div className="nova-generation-turn__holding">
          <span className="nova-generation-turn__holding-text">
            Preparing images and prompt suggestions...
          </span>
        </div>
      ) : item.slots ? (
        <GenerationSlotGrid
          slots={item.slots}
          isGenerating={item.isGenerating}
          generationModel={item.generationModel}
          enableDownload={props.enableDownload}
          enableImageEdit={props.enableImageEdit}
          selectedImageId={props.selectedImageId}
          turnPrompt={turnPrompt}
          resultGroupId={item.id}
          onSelectImage={props.onSelectImage}
          onContinueEdit={props.onImageContinueEdit}
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
              selectedImageId={props.selectedImageId}
              onSelectImage={props.onSelectImage}
              onImageContinueEdit={props.onImageContinueEdit}
              onTurnRegenerate={props.onTurnRegenerate}
              onSuggestionSelect={props.onSuggestionSelect}
            />
          );
        }

        if (item.type === 'message') {
          if (item.message.role === 'user') {
            return null;
          }

          return <ConversationMessageBubble key={item.message.id} message={item.message} />;
        }

        return null;
      })}
    </div>
  );
}
