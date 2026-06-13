import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Plus, X } from 'lucide-react';
import type { ComposerAttachment, ComposerReferenceAttachment } from './types';

interface DisplayAttachment {
  id: string;
  name: string;
  previewUrl: string;
  local: boolean;
}

export interface ComposerAttachmentStackProps {
  attachments: ComposerAttachment[];
  references?: ComposerReferenceAttachment[];
  accept?: string[];
  disabled?: boolean;
  multiple?: boolean;
  maxAttachments?: number;
  onAddFiles: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onRemoveReference?: (id: string) => void;
}

export function ComposerAttachmentStack(props: ComposerAttachmentStackProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState<string>();
  const [preview, setPreview] = useState<DisplayAttachment>();
  const items = useMemo<DisplayAttachment[]>(
    () => [
      ...(props.references ?? []).map((item) => ({ ...item, local: false })),
      ...props.attachments.map((item) => ({ ...item, local: true })),
    ],
    [props.attachments, props.references],
  );
  const canAdd = items.length < (props.maxAttachments ?? 9);

  useEffect(() => {
    if (items.length === 0) setExpanded(false);
  }, [items.length]);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(undefined);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preview]);

  const selectFiles = (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (selected.length > 0) props.onAddFiles(selected);
  };

  return (
    <>
      <div
        className={[
          'nova-composer-input__attachments',
          expanded ? 'is-expanded' : '',
          items.length > 0 ? 'has-attachments' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="image-stack"
        style={
          {
            '--attachment-count': items.length,
            '--attachment-total': items.length,
          } as CSSProperties
        }
        onMouseEnter={() => items.length > 0 && setExpanded(true)}
        onMouseLeave={() => {
          setExpanded(false);
          setHoveredId(undefined);
        }}
      >
        {items.map((item, index) => (
          <div
            className={`nova-composer-input__attachment ${
              hoveredId === item.id ? 'is-hovered' : ''
            }`}
            data-testid="image-stack-item"
            key={`${item.local ? 'local' : 'reference'}-${item.id}`}
            style={{ '--attachment-index': index } as CSSProperties}
            role="button"
            tabIndex={0}
            aria-label={`预览 ${item.name}`}
            onMouseEnter={() => setHoveredId(item.id)}
            onClick={() => setPreview(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setPreview(item);
              }
            }}
          >
            <img src={item.previewUrl} alt={item.name} />
            <span>{item.name}</span>
            <button
              type="button"
              data-testid="image-stack-remove"
              aria-label={`删除 ${item.name}`}
              onClick={(event) => {
                event.stopPropagation();
                if (item.local) props.onRemoveAttachment(item.id);
                else props.onRemoveReference?.(item.id);
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {canAdd && (
          <label
            className="nova-composer-input__attachment-add"
            data-testid="image-stack-upload"
            aria-label="添加图片"
            style={{ '--attachment-index': items.length } as CSSProperties}
          >
            <input
              type="file"
              accept={props.accept?.join(',') ?? 'image/*'}
              multiple={props.multiple !== false}
              disabled={props.disabled}
              onChange={(event) => {
                selectFiles(event.currentTarget.files);
                event.currentTarget.value = '';
              }}
            />
            <Plus size={items.length > 0 ? 22 : 28} />
          </label>
        )}
      </div>

      {preview && (
        <div
          className="nova-composer-input__preview"
          role="dialog"
          aria-modal="true"
          aria-label={`预览 ${preview.name}`}
          onClick={() => setPreview(undefined)}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <header>
              <span>{preview.name}</span>
              <button type="button" aria-label="关闭预览" onClick={() => setPreview(undefined)}>
                <X size={16} />
              </button>
            </header>
            <img src={preview.previewUrl} alt={preview.name} />
          </div>
        </div>
      )}
    </>
  );
}
