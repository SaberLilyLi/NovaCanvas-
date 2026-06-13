import { useRef } from 'react';
import type { GeneratedImage, ImageResolutionCap } from '@novacanvas/types';
import type { ComposerSubmitContext } from './composer/types';
import { NovaComposerInput } from './composer/nova-composer-input';
import type { ComposerModelOption } from './composer-model-picker';
import { GENERATION_BUSY_PLACEHOLDER } from './generation-lock';
import type { GenerationImageActionHandler } from './generation-image-actions';
import type { ImageSizeSettings } from './image-size-settings';
import type { NovaConversationItem } from './nova-conversation-view';
import { NovaConversationView } from './nova-conversation-view';
import { useComposerCompact } from './use-composer-compact';

export interface NovaCanvasConversationProps {
  composerKey?: number;
  theme: 'light' | 'dark';
  isEmpty?: boolean;
  items: NovaConversationItem[];
  imageSizeSettings: ImageSizeSettings;
  maxImageResolution?: ImageResolutionCap;
  count: number;
  creditCostPerImage?: number;
  generationModel?: string;
  generationModelOptions?: ComposerModelOption[];
  defaultValue?: string;
  isSubmitting: boolean;
  isInteractionLocked?: boolean;
  enableUpload?: boolean;
  enableMultiImage?: boolean;
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  enableModelSelector?: boolean;
  loadingSuggestionTurnIds?: string[];
  selectedImageId?: string;
  onImageSizeSettingsChange: (value: ImageSizeSettings) => void;
  onCountChange: (value: number) => void;
  onGenerationModelChange?: (value: string) => void;
  onSelectImage?: (image: GeneratedImage) => void;
  onImageContinueEdit?: GenerationImageActionHandler;
  onTurnRegenerate?: (turnPrompt: string, slotCount: number) => void;
  onSuggestionSelect?: (prompt: string) => void;
  onSend: (value: string, context: ComposerSubmitContext) => Promise<boolean>;
}

export function NovaCanvasConversation(props: NovaCanvasConversationProps) {
  const messagesRef = useRef<HTMLDivElement>(null);
  const composerDisabled = props.isSubmitting || Boolean(props.isInteractionLocked);
  const compact = useComposerCompact(
    messagesRef,
    !props.isEmpty,
    Boolean(props.isInteractionLocked),
  );

  return (
    <div
      className={`nova-composer__ai-studio ${props.isEmpty ? 'is-empty' : 'has-messages'}`}
      data-theme={props.theme}
    >
      <div ref={messagesRef} className="nova-composer__ai-studio-messages">
        <NovaConversationView
          items={props.items}
          enableImageEdit={props.enableImageEdit}
          enableDownload={props.enableDownload}
          loadingSuggestionTurnIds={props.loadingSuggestionTurnIds}
          isInteractionLocked={props.isInteractionLocked}
          selectedImageId={props.selectedImageId}
          onSelectImage={props.onSelectImage}
          onImageContinueEdit={props.onImageContinueEdit}
          onTurnRegenerate={props.onTurnRegenerate}
          onSuggestionSelect={props.onSuggestionSelect}
        />
      </div>
      <div className="nova-composer__ai-studio-composer">
        <div className="nova-composer__composer-shell">
          <NovaComposerInput
            key={props.composerKey}
            defaultValue={props.defaultValue ?? ''}
            theme={props.theme}
            compact={compact}
            openPickersBelow={props.isEmpty}
            placeholder={
              props.isInteractionLocked
                ? GENERATION_BUSY_PLACEHOLDER
                : '请描述你想生成的图片...'
            }
            disabled={composerDisabled}
            submitting={props.isSubmitting}
            enableUpload={props.enableUpload}
            enableMultiImage={props.enableMultiImage}
            maxAttachments={9}
            maxFileSize={10 * 1024 * 1024}
            accept={['image/*']}
            imageSizeSettings={props.imageSizeSettings}
            maxImageResolution={props.maxImageResolution}
            count={props.count}
            creditCostPerImage={props.creditCostPerImage}
            generationModel={props.generationModel}
            generationModelOptions={
              props.enableModelSelector === false ? undefined : props.generationModelOptions
            }
            onImageSizeSettingsChange={props.onImageSizeSettingsChange}
            onCountChange={props.onCountChange}
            onGenerationModelChange={props.onGenerationModelChange}
            onSubmit={props.onSend}
          />
        </div>
      </div>
    </div>
  );
}
