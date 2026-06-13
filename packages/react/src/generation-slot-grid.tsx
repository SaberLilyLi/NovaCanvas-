import { Image } from '@arco-design/web-react';
import { AlertCircle } from 'lucide-react';
import { GenerationLoadingMotion } from './generation-loading-motion';
import type { GenerationSlot } from './generation-slots';
import { useImagePreviewProps } from './image-preview-download';

export interface GenerationSlotGridProps {
  slots: GenerationSlot[];
  isGenerating?: boolean;
  generationModel?: string;
  enableDownload?: boolean;
}

function GenerationSlotItem(props: {
  slot: GenerationSlot;
  enableDownload?: boolean;
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
    return (
      <div className="nova-generation-grid__result">
        <Image
          className="nova-generation-grid__image"
          src={slot.image!.url}
          alt={`生成结果 ${slot.index}`}
          preview
          previewProps={previewProps}
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
            <GenerationSlotItem slot={slot} enableDownload={props.enableDownload} />
          </article>
        ))}
      </div>
    </section>
  );
}
