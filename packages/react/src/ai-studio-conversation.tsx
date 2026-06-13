import { AiComposer } from '@company/ai-studio-sdk/react';
import type { ComposerAttachment } from '@company/ai-studio-sdk/types';
import type { ImageResolutionCap } from '@novacanvas/types';
import '@company/ai-studio-sdk/styles.css';
import { ComposerCountPicker } from './composer-count-picker';
import { ComposerModelPicker, type ComposerModelOption } from './composer-model-picker';
import { ComposerSizePicker } from './composer-size-picker';
import { GENERATION_BUSY_PLACEHOLDER } from './generation-lock';
import type { ImageSizeSettings } from './image-size-settings';
import type { NovaConversationItem } from './nova-conversation-view';
import { NovaConversationView } from './nova-conversation-view';

export interface AiStudioConversationProps {
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
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  enableModelSelector?: boolean;
  loadingSuggestionTurnIds?: string[];
  onImageSizeSettingsChange: (value: ImageSizeSettings) => void;
  onCountChange: (value: number) => void;
  onGenerationModelChange?: (value: string) => void;
  onTurnContinueEdit?: (turnPrompt: string) => void;
  onTurnRegenerate?: (turnPrompt: string, slotCount: number) => void;
  onSuggestionSelect?: (prompt: string) => void;
  onSend: (value: string, context: { attachments: ComposerAttachment[] }) => Promise<void>;
}

export function AiStudioConversation(props: AiStudioConversationProps) {
  const composerDisabled = props.isSubmitting || Boolean(props.isInteractionLocked);
  const creditCost = Math.max(1, props.creditCostPerImage ?? 1);
  const totalCredits = props.count * creditCost;
  const showModelPicker =
    props.enableModelSelector !== false &&
    Boolean(props.generationModelOptions?.length) &&
    Boolean(props.onGenerationModelChange);

  return (
    <div
      className={`nova-composer__ai-studio ${props.isEmpty ? 'is-empty' : 'has-messages'}`}
      data-theme={props.theme === 'dark' ? 'dark' : 'light'}
    >
      <div className="nova-composer__ai-studio-messages">
        <NovaConversationView
          items={props.items}
          enableImageEdit={props.enableImageEdit}
          enableDownload={props.enableDownload}
          loadingSuggestionTurnIds={props.loadingSuggestionTurnIds}
          isInteractionLocked={props.isInteractionLocked}
          onTurnContinueEdit={props.onTurnContinueEdit}
          onTurnRegenerate={props.onTurnRegenerate}
          onSuggestionSelect={props.onSuggestionSelect}
        />
      </div>
      <div className="nova-composer__ai-studio-composer">
        <div className="nova-composer__composer-shell">
          <AiComposer
            key={props.composerKey}
            defaultValue={props.defaultValue ?? ''}
            theme={props.theme === 'dark' ? 'dark' : 'light'}
            placeholder={
              props.isInteractionLocked
                ? GENERATION_BUSY_PLACEHOLDER
                : '请描述你想生成的图片...'
            }
            minRows={2}
            maxRows={6}
            disabled={composerDisabled}
            uploadOptions={
              composerDisabled
                ? undefined
                : {
                    accept: ['image/*'],
                    maxFiles: 9,
                    maxFileSize: 10 * 1024 * 1024,
                  }
            }
            onSend={props.onSend}
          />
          <div className="nova-composer__composer-toolbar-inject">
            {showModelPicker ? (
              <ComposerModelPicker
                value={props.generationModel}
                options={props.generationModelOptions ?? []}
                disabled={composerDisabled}
                openBelow={props.isEmpty}
                onChange={props.onGenerationModelChange!}
              />
            ) : null}
            <ComposerSizePicker
              value={props.imageSizeSettings}
              disabled={composerDisabled}
              openBelow={props.isEmpty}
              maxResolution={props.maxImageResolution}
              onChange={props.onImageSizeSettingsChange}
            />
            <ComposerCountPicker
              value={props.count}
              disabled={composerDisabled}
              openBelow={props.isEmpty}
              onChange={props.onCountChange}
            />
          </div>
          <div className="nova-composer__composer-credits-inject" aria-live="polite">
            <span className="nova-composer__composer-credits-icon" aria-hidden>
              ✦
            </span>
            <span className="nova-composer__composer-credits-value">{totalCredits}</span>
            <span className="nova-composer__composer-credits-unit">积分</span>
          </div>
        </div>
      </div>
    </div>
  );
}
