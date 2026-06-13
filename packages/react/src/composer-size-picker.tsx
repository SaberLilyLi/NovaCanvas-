import { useMemo, useState } from 'react';
import { Input, Popover } from '@arco-design/web-react';
import { Link2, Unlink2 } from 'lucide-react';
import { normalizeImageDimensions } from '@novacanvas/types';
import type { ImageResolutionCap } from '@novacanvas/types';
import {
  getAvailableResolutionOptions,
  getDimensionsForRatio,
  getResolutionLabel,
  RATIO_PRESETS,
  type ImageSizeSettings,
  type RatioPreset,
  type ResolutionTier,
} from './image-size-settings';

export interface ComposerSizePickerProps {
  value: ImageSizeSettings;
  disabled?: boolean;
  openBelow?: boolean;
  maxResolution?: ImageResolutionCap;
  onChange: (value: ImageSizeSettings) => void;
}

function RatioIcon({ ratio }: { ratio: RatioPreset }) {
  const [w = 1, h = 1] = ratio.split(':').map(Number);
  const maxEdge = 18;
  const width = w >= h ? maxEdge : Math.max(8, Math.round((maxEdge * w) / h));
  const height = h >= w ? maxEdge : Math.max(8, Math.round((maxEdge * h) / w));

  return (
    <span
      className="nova-size-picker__ratio-icon"
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-hidden
    />
  );
}

export function ComposerSizePicker(props: ComposerSizePickerProps) {
  const [open, setOpen] = useState(false);
  const resolutionOptions = useMemo(
    () => getAvailableResolutionOptions(props.maxResolution ?? '2k'),
    [props.maxResolution],
  );
  const triggerLabel = useMemo(
    () => `${props.value.ratio} ${getResolutionLabel(props.value.resolution)}`,
    [props.value.ratio, props.value.resolution],
  );

  const updateRatio = (ratio: RatioPreset) => {
    const { width, height } = getDimensionsForRatio(ratio, props.value.resolution);
    props.onChange({ ...props.value, ratio, width, height });
  };

  const updateResolution = (resolution: ResolutionTier) => {
    const { width, height } = getDimensionsForRatio(props.value.ratio, resolution);
    props.onChange({ ...props.value, resolution, width, height });
  };

  const getRatioParts = () => {
    const parts = props.value.ratio.split(':').map((part) => Number(part));
    return {
      ratioWidth: parts[0] || 1,
      ratioHeight: parts[1] || 1,
    };
  };

  const updateWidth = (width: number) => {
    if (!Number.isFinite(width) || width <= 0) return;
    if (props.value.linked) {
      const { ratioWidth, ratioHeight } = getRatioParts();
      const height = Math.round((width * ratioHeight) / ratioWidth);
      const normalized = normalizeImageDimensions(width, height);
      props.onChange({ ...props.value, ...normalized });
      return;
    }
    const normalized = normalizeImageDimensions(width, props.value.height);
    props.onChange({ ...props.value, ...normalized });
  };

  const updateHeight = (height: number) => {
    if (!Number.isFinite(height) || height <= 0) return;
    if (props.value.linked) {
      const { ratioWidth, ratioHeight } = getRatioParts();
      const width = Math.round((height * ratioWidth) / ratioHeight);
      const normalized = normalizeImageDimensions(width, height);
      props.onChange({ ...props.value, ...normalized });
      return;
    }
    const normalized = normalizeImageDimensions(props.value.width, height);
    props.onChange({ ...props.value, ...normalized });
  };

  const panel = (
    <div className="nova-size-picker__panel">
      <section className="nova-size-picker__section">
        <h4>选择比例</h4>
        <div className="nova-size-picker__ratio-grid">
          {RATIO_PRESETS.map((ratio) => (
            <button
              key={ratio}
              type="button"
              className={props.value.ratio === ratio ? 'is-active' : ''}
              onClick={() => updateRatio(ratio)}
            >
              <RatioIcon ratio={ratio} />
              <span>{ratio}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="nova-size-picker__section">
        <h4>选择分辨率</h4>
        <div className="nova-size-picker__resolution">
          {resolutionOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={props.value.resolution === option.value ? 'is-active' : ''}
              onClick={() => updateResolution(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="nova-size-picker__section">
        <h4>尺寸</h4>
        <div className="nova-size-picker__dimensions">
          <label>
            <span>W</span>
            <Input
              size="small"
              value={String(props.value.width)}
              onChange={(value) => updateWidth(Number(value))}
            />
          </label>
          <button
            type="button"
            className="nova-size-picker__link"
            aria-label={props.value.linked ? '解除比例锁定' : '锁定比例'}
            onClick={() => props.onChange({ ...props.value, linked: !props.value.linked })}
          >
            {props.value.linked ? <Link2 size={14} /> : <Unlink2 size={14} />}
          </button>
          <label>
            <span>H</span>
            <Input
              size="small"
              value={String(props.value.height)}
              onChange={(value) => updateHeight(Number(value))}
            />
          </label>
          <span className="nova-size-picker__unit">PX</span>
        </div>
      </section>
    </div>
  );

  return (
    <Popover
      popupVisible={open}
      onVisibleChange={setOpen}
      trigger="click"
      position={props.openBelow ? 'bl' : 'tl'}
      blurToHide={false}
      className="nova-size-picker__popover"
      getPopupContainer={() => document.body}
      content={panel}
      disabled={props.disabled}
    >
      <button
        type="button"
        className="nova-size-picker__trigger"
        disabled={props.disabled}
        aria-expanded={open}
      >
        <RatioIcon ratio={props.value.ratio} />
        <span>{triggerLabel}</span>
      </button>
    </Popover>
  );
}
