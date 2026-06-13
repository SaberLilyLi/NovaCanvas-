import { Image } from '@arco-design/web-react';
import type { GeneratedImage } from '@novacanvas/types';
import { AlertCircle, Check } from 'lucide-react';
import type { GenerationImageActionHandler } from './generation-image-actions';
import { GenerationLoadingMotion } from './generation-loading-motion';
import { GenerationSlotActions } from './generation-slot-actions';
import type { GenerationSlot } from './generation-slots';
import { useImagePreviewProps } from './image-preview-download';

export interface GenerationSlotGridProps {
  slots: GenerationSlot[];
  isGenerating?: boolean;
  generationModel?: string;
  enableDownload?: boolean;
  enableImageEdit?: boolean;
  selectedImageId?: string;
  turnPrompt: string;
  resultGroupId?: string;
  onSelectImage?: (image: GeneratedImage) => void;
  onContinueEdit?: GenerationImageActionHandler;
  onRegenerate?: GenerationImageActionHandler;
}

function GenerationSlotItem(props: {
  slot: GenerationSlot;
  enableDownload?: boolean;
  enableImageEdit?: boolean;
  selectedImageId?: string;
  turnPrompt: string;
  resultGroupId?: string;
  onSelectImage?: (image: GeneratedImage) => void;
  onContinueEdit?: GenerationImageActionHandler;
  onRegenerate?: GenerationImageActionHandler;
}) {
  const { slot, enableDownload } = props;
  const isFailed = slot.status === 'failed';
  const isComplete = Boolean(slot.image);
  const previewProps = useImagePreviewProps({
    url: slot.image?.url,
    filename: slot.image?.name,
    enabled: enableDownload !== false,
  });

  if (!isFailed && isComplete) {
    const selected = props.selectedImageId === slot.image!.id;
    return (
      <div
        className={`nova-generation-grid__result ${selected ? 'is-selected' : ''}`}
        onClick={() => props.onSelectImage?.(slot.image!)}
      >
        <Image
          className="nova-generation-grid__image"
          src={slot.image!.url}
          alt={`生成结果 ${slot.index}`}
          preview
          previewProps={previewProps}
        />
        {selected && (
          <span className="nova-generation-grid__selected" aria-label="已选择">
            <Check size={14} />
          </span>
        )}
        <GenerationSlotActions
          image={slot.image!}
          turnPrompt={props.turnPrompt}
          resultGroupId={props.resultGroupId}
          enableImageEdit={props.enableImageEdit}
          onContinueEdit={props.onContinueEdit}
          onRegenerate={props.onRegenerate}
        />
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="nova-generation-placeholder nova-generation-placeholder--error">
        <span className="nova-generation-placeholder__badge">生成失败</span>
        <AlertCircle size={20} />
        <small>{slot.errorMessage ?? '请重试'}</small>
      </div>
    );
  }

  return (
    <div className="nova-generation-placeholder">
      <GenerationLoadingMotion
        seed={`${slot.taskId}:${slot.index}`}
        className="nova-generation-loading-motion--slot"
      />
    </div>
  );
}

export function GenerationSlotGrid(props: GenerationSlotGridProps) {
  const isSingle = props.slots.length === 1;
  const columnCount = Math.min(props.slots.length, 4);

  return (
    <section
      className={`nova-generation-block ${props.isGenerating ? 'nova-generation-block--active' : ''}`}
    >
      <div
        className={[
          'nova-generation-grid',
          isSingle ? 'nova-generation-grid--single' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          !isSingle
            ? { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {props.slots.map((slot) => (
          <article className="nova-generation-grid__item" key={`slot-${slot.index}`}>
            <GenerationSlotItem
              slot={slot}
              enableDownload={props.enableDownload}
              enableImageEdit={props.enableImageEdit}
              selectedImageId={props.selectedImageId}
              turnPrompt={props.turnPrompt}
              resultGroupId={props.resultGroupId}
              onSelectImage={props.onSelectImage}
              onContinueEdit={props.onContinueEdit}
              onRegenerate={props.onRegenerate}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
