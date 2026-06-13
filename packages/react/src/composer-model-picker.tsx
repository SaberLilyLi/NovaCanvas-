import { useMemo, useState } from 'react';
import { Popover } from '@arco-design/web-react';
import { Box } from 'lucide-react';

export interface ComposerModelOption {
  label: string;
  value: string;
}

export interface ComposerModelPickerProps {
  value?: string;
  options: ComposerModelOption[];
  disabled?: boolean;
  openBelow?: boolean;
  onChange: (value: string) => void;
}

function shortModelLabel(label: string): string {
  const trimmed = label.trim();
  const versionMatch = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (/seedream/i.test(trimmed) && versionMatch) {
    return `图片 ${versionMatch[1]}`;
  }
  if (/chat\s*image\s*2|image\s*2/i.test(trimmed)) {
    return 'Chat Image 2';
  }
  return trimmed.length > 12 ? `${trimmed.slice(0, 12)}…` : trimmed;
}

export function ComposerModelPicker(props: ComposerModelPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => props.options.find((item) => item.value === props.value) ?? props.options[0],
    [props.options, props.value],
  );

  if (props.options.length === 0 || !selected) {
    return null;
  }

  const panel = (
    <div className="nova-composer-chip-picker__panel">
      <div className="nova-composer-chip-picker__list">
        {props.options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === selected.value ? 'is-active' : ''}
            onClick={() => {
              props.onChange(option.value);
              setOpen(false);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Popover
      popupVisible={open}
      onVisibleChange={setOpen}
      trigger="click"
      position={props.openBelow ? 'bl' : 'tl'}
      blurToHide={false}
      className="nova-composer-chip-picker__popover"
      getPopupContainer={() => document.body}
      content={panel}
      disabled={props.disabled}
    >
      <button
        type="button"
        className="nova-composer-chip-picker__trigger"
        disabled={props.disabled}
        aria-label="模型"
        aria-expanded={open}
      >
        <Box size={15} strokeWidth={1.75} aria-hidden />
        <span>{shortModelLabel(selected.label)}</span>
      </button>
    </Popover>
  );
}
