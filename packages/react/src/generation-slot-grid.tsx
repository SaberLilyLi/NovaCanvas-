import { Image } from '@arco-design/web-react';
import { AlertCircle } from 'lucide-react';
import { GenerationLoadingMotion } from './generation-loading-motion';
import type { GenerationSlot } from './generation-slots';
import { useImagePreviewProps } from './image-preview-download';
import {
  formatGenerationProgressLabel,
  useFakeGenerationProgress,
} from './use-fake-generation-progress';

export interface GenerationSlotGridProps {
  slots: GenerationSlot[];
  isGenerating?: boolean;
  enableDownload?: boolean;
}

function isSlotTerminal(slot: GenerationSlot): boolean {
  return Boolean(slot.image) || slot.status === 'failed';
}

function GenerationSlotItem(props: {
  slot: GenerationSlot;
  showProgressBadge?: boolean;
  progress?: number;
  enableDownload?: boolean;
}) {
  const { slot, showProgressBadge, progress = 0, enableDownload } = props;
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
      {showProgressBadge && (
        <span className="nova-generation-placeholder__badge">
          {formatGenerationProgressLabel(progress)}
        </span>
      )}
    </div>
  );
}

export function GenerationSlotGrid(props: GenerationSlotGridProps) {
  const isSingle = props.slots.length === 1;
  const batchMode = props.slots.length > 1;
  const columnCount = Math.min(props.slots.length, 4);
  const firstSlot = props.slots[0];
  const allTerminal = props.slots.every(isSlotTerminal);
  const batchKey = props.slots.map((slot) => slot.taskId).join(':');
  const progressComplete = batchMode ? allTerminal : Boolean(firstSlot?.image);
  const progressEnabled =
    Boolean(props.isGenerating) &&
    props.slots.length > 0 &&
    props.slots.some((slot) => slot.status !== 'failed');

  const { progress } = useFakeGenerationProgress(batchKey, progressComplete, progressEnabled);
  const showBatchProgressBadge =
    batchMode && Boolean(props.isGenerating) && !allTerminal;

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
        {showBatchProgressBadge && (
          <span className="nova-generation-grid__progress-badge">
            {formatGenerationProgressLabel(progress)}
          </span>
        )}
        {props.slots.map((slot, index) => (
          <article className="nova-generation-grid__item" key={`slot-${slot.index}`}>
            <GenerationSlotItem
              slot={slot}
              showProgressBadge={!batchMode && index === 0}
              progress={progress}
              enableDownload={props.enableDownload}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
