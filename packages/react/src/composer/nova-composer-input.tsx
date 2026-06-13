import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { Message, Spin } from '@arco-design/web-react';
import type { ImageResolutionCap } from '@novacanvas/types';
import { ArrowUp } from 'lucide-react';
import { ComposerCountPicker } from '../composer-count-picker';
import {
  ComposerModelPicker,
  type ComposerModelOption,
} from '../composer-model-picker';
import { ComposerSizePicker } from '../composer-size-picker';
import type { ImageSizeSettings } from '../image-size-settings';
import { ComposerAttachmentStack } from './composer-attachment-stack';
import type {
  ComposerReferenceAttachment,
  ComposerSubmitContext,
} from './types';
import { useComposerAttachments } from './use-composer-attachments';

export interface NovaComposerInputProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  submitting?: boolean;
  placeholder?: string;
  enableUpload?: boolean;
  enableMultiImage?: boolean;
  maxAttachments?: number;
  maxFileSize?: number;
  accept?: string[];
  theme?: 'light' | 'dark';
  compact?: boolean;
  openPickersBelow?: boolean;
  imageSizeSettings: ImageSizeSettings;
  maxImageResolution?: ImageResolutionCap;
  count: number;
  generationModel?: string;
  generationModelOptions?: ComposerModelOption[];
  creditCostPerImage?: number;
  referenceAttachments?: ComposerReferenceAttachment[];
  onRemoveReference?: (id: string) => void;
  onValueChange?: (value: string) => void;
  onImageSizeSettingsChange: (value: ImageSizeSettings) => void;
  onCountChange: (value: number) => void;
  onGenerationModelChange?: (value: string) => void;
  onSubmit: (
    value: string,
    context: ComposerSubmitContext,
  ) => void | boolean | Promise<void | boolean>;
}

export function NovaComposerInput(props: NovaComposerInputProps) {
  const controlled = props.value !== undefined;
  const [internalValue, setInternalValue] = useState(props.defaultValue ?? '');
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [composing, setComposing] = useState(false);
  const value = controlled ? props.value! : internalValue;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const uploadEnabled = props.enableUpload !== false;
  const disabled = Boolean(props.disabled || props.submitting);

  const attachmentState = useComposerAttachments({
    enabled: uploadEnabled && !disabled,
    multiple: props.enableMultiImage !== false,
    accept: props.accept,
    maxAttachments: props.maxAttachments,
    maxFileSize: props.maxFileSize,
    onError: (message) => Message.warning(message),
  });

  useEffect(() => {
    if (!controlled) setInternalValue(props.defaultValue ?? '');
  }, [controlled, props.defaultValue]);

  const setValue = (next: string) => {
    if (!controlled) setInternalValue(next);
    props.onValueChange?.(next);
  };

  const hasReferences = Boolean(props.referenceAttachments?.length);
  const hasAttachments = attachmentState.attachments.length > 0 || hasReferences;
  const expanded = !props.compact || focused || Boolean(value.trim()) || hasAttachments;
  const canSubmit =
    !disabled &&
    !attachmentState.hasProcessingAttachment &&
    !attachmentState.hasErrorAttachment &&
    (Boolean(value.trim()) || hasAttachments);
  const showModelPicker =
    Boolean(props.generationModelOptions?.length) &&
    Boolean(props.onGenerationModelChange);
  const totalCredits = props.count * Math.max(1, props.creditCostPerImage ?? 1);

  const submit = async () => {
    if (!canSubmit) return;
    try {
      const result = await props.onSubmit(value.trim(), {
        attachments: attachmentState.attachments,
      });
      if (result === false) return;
      setValue('');
      attachmentState.clearAttachments();
    } catch {
      // Keep the prompt and attachments so the user can retry.
    }
  };

  const addTransferFiles = (files: File[]) => {
    if (!uploadEnabled || disabled) return;
    attachmentState.addFiles(files);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith('image/'),
    );
    if (files.length === 0) return;
    event.preventDefault();
    addTransferFiles(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addTransferFiles(Array.from(event.dataTransfer.files));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      !composing
    ) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div
      className={[
        'nova-composer-input',
        expanded ? 'is-expanded' : 'is-compact',
        dragging ? 'is-dragging' : '',
        disabled ? 'is-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-theme={props.theme ?? 'light'}
      onDragEnter={(event) => {
        event.preventDefault();
        if (uploadEnabled && !disabled) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
      onClick={() => textareaRef.current?.focus()}
    >
      <div className="nova-composer-input__body">
        {uploadEnabled && (
          <ComposerAttachmentStack
            attachments={attachmentState.attachments}
            references={props.referenceAttachments}
            accept={props.accept}
            disabled={disabled}
            multiple={props.enableMultiImage !== false}
            maxAttachments={props.maxAttachments}
            onAddFiles={attachmentState.addFiles}
            onRemoveAttachment={attachmentState.removeAttachment}
            onRemoveReference={props.onRemoveReference}
          />
        )}
        <textarea
          ref={textareaRef}
          className="nova-composer-input__textarea"
          value={value}
          disabled={disabled}
          rows={2}
          placeholder={props.placeholder ?? '请描述你想生成的图片...'}
          aria-label="创作提示词"
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
      </div>

      <footer className="nova-composer-input__footer">
        <div className="nova-composer-input__toolbar">
          {showModelPicker && (
            <ComposerModelPicker
              value={props.generationModel}
              options={props.generationModelOptions ?? []}
              disabled={disabled}
              openBelow={props.openPickersBelow}
              onChange={props.onGenerationModelChange!}
            />
          )}
          <ComposerSizePicker
            value={props.imageSizeSettings}
            disabled={disabled}
            openBelow={props.openPickersBelow}
            maxResolution={props.maxImageResolution}
            onChange={props.onImageSizeSettingsChange}
          />
          <ComposerCountPicker
            value={props.count}
            disabled={disabled}
            openBelow={props.openPickersBelow}
            onChange={props.onCountChange}
          />
        </div>
        <div className="nova-composer-input__actions">
          <span className="nova-composer-input__credits" aria-live="polite">
            <span aria-hidden>✦</span>
            {totalCredits} 积分
          </span>
          <button
            className="nova-composer-input__send"
            type="button"
            disabled={!canSubmit}
            onClick={(event) => {
              event.stopPropagation();
              void submit();
            }}
            aria-label="发送"
          >
            {props.submitting ? <Spin size={16} /> : <ArrowUp size={18} strokeWidth={2.25} />}
          </button>
        </div>
      </footer>
      {dragging && <div className="nova-composer-input__drop-hint">松开以添加图片</div>}
    </div>
  );
}
