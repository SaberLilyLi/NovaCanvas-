import { useState } from 'react';
import { Popover } from '@arco-design/web-react';
import type { ImageResolutionCap } from '@novacanvas/types';
import {
  getDimensionsForRatio,
  getResolutionLabel,
  isResolutionTierAvailable,
  RESOLUTION_OPTIONS,
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
  const maxCap = props.maxResolution ?? '2k';

  const updateRatio = (ratio: RatioPreset) => {
    const { width, height } = getDimensionsForRatio(ratio, props.value.resolution);
    props.onChange({ ...props.value, ratio, width, height });
  };

  const updateResolution = (resolution: ResolutionTier) => {
    const { width, height } = getDimensionsForRatio(props.value.ratio, resolution);
    props.onChange({ ...props.value, resolution, width, height });
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
        <h4>清晰度</h4>
        <div className="nova-size-picker__resolution" role="group" aria-label="清晰度">
          {RESOLUTION_OPTIONS.map((option) => {
            const available = isResolutionTierAvailable(option.value, maxCap);
            return (
              <button
                key={option.value}
                type="button"
                className={[
                  props.value.resolution === option.value ? 'is-active' : '',
                  available ? '' : 'is-disabled',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!available || props.disabled}
                title={available ? undefined : '当前模型配置暂不支持该清晰度'}
                onClick={() => updateResolution(option.value)}
              >
                {option.label}
              </button>
            );
          })}
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
        className="nova-size-picker__trigger nova-size-picker__trigger--jimeng"
        disabled={props.disabled}
        aria-label="尺寸"
        aria-expanded={open}
      >
        <span className="nova-size-picker__segment nova-size-picker__segment--ratio">
          <RatioIcon ratio={props.value.ratio} />
          <span>{props.value.ratio}</span>
        </span>
        <span className="nova-size-picker__segment-divider" aria-hidden />
        <span className="nova-size-picker__segment nova-size-picker__segment--resolution">
          {getResolutionLabel(props.value.resolution)}
        </span>
      </button>
    </Popover>
  );
}
