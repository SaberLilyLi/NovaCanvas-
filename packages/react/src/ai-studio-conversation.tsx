import { useMemo } from 'react';
import { AiComposer } from '@company/ai-studio-sdk/react';
import type { ComposerAttachment } from '@company/ai-studio-sdk/types';
import type { GeneratedImage, ImageResolutionCap } from '@novacanvas/types';
import '@company/ai-studio-sdk/styles.css';
import { GENERATION_BUSY_PLACEHOLDER } from './generation-lock';
import { ComposerSizePicker } from './composer-size-picker';
import type { ImageSizeSettings } from './image-size-settings';
import type { NovaConversationItem } from './nova-conversation-view';
import { NovaConversationView } from './nova-conversation-view';

export interface AiStudioConversationProps {
  theme: 'light' | 'dark';
  isEmpty?: boolean;
  items: NovaConversationItem[];
  imageSizeSettings: ImageSizeSettings;
  maxImageResolution?: ImageResolutionCap;
  count: number;
  defaultValue?: string;
  isSubmitting: boolean;
  isInteractionLocked?: boolean;
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  loadingSuggestionTurnIds?: string[];
  onImageSizeSettingsChange: (value: ImageSizeSettings) => void;
  onCountChange: (value: number) => void;
  onTurnContinueEdit?: (turnPrompt: string) => void;
  onTurnRegenerate?: (turnPrompt: string, slotCount: number) => void;
  onSuggestionSelect?: (prompt: string) => void;
  onSend: (value: string, context: { attachments: ComposerAttachment[] }) => Promise<void>;
}

export function AiStudioConversation(props: AiStudioConversationProps) {
  const actionOptions = useMemo(
    () => [
      {
        id: 'count',
        label: '数量',
        value: String(props.count),
        options: [1, 2, 3, 4].map((item) => ({
          label: `${item} 张`,
          value: String(item),
        })),
      },
    ],
    [props.count],
  );

  const composerDisabled = props.isSubmitting || Boolean(props.isInteractionLocked);

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
            defaultValue={props.defaultValue ?? ''}
            theme={props.theme === 'dark' ? 'dark' : 'light'}
            placeholder={
              props.isInteractionLocked
                ? GENERATION_BUSY_PLACEHOLDER
                : '请描述你想生成的图片...'
            }
            minRows={2}
            maxRows={6}
            showActionOptions
            actionOptions={actionOptions}
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
            onActionOptionChange={(id: string, value: string) => {
              if (composerDisabled) return;
              if (id === 'count') props.onCountChange(Number(value));
            }}
            onSend={props.onSend}
          />
          <div className="nova-composer__composer-toolbar-inject">
            <ComposerSizePicker
              value={props.imageSizeSettings}
              disabled={composerDisabled}
              openBelow={props.isEmpty}
              maxResolution={props.maxImageResolution}
              onChange={props.onImageSizeSettingsChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
