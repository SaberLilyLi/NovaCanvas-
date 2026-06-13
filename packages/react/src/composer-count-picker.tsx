import { useState } from 'react';
import { Popover } from '@arco-design/web-react';

const COUNT_OPTIONS = [1, 2, 3, 4];

export interface ComposerCountPickerProps {
  value: number;
  disabled?: boolean;
  openBelow?: boolean;
  onChange: (value: number) => void;
}

export function ComposerCountPicker(props: ComposerCountPickerProps) {
  const [open, setOpen] = useState(false);

  const panel = (
    <div className="nova-composer-chip-picker__panel">
      <div className="nova-composer-chip-picker__list nova-composer-chip-picker__list--compact">
        {COUNT_OPTIONS.map((item) => (
          <button
            key={item}
            type="button"
            className={item === props.value ? 'is-active' : ''}
            onClick={() => {
              props.onChange(item);
              setOpen(false);
            }}
          >
            {item} 张
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
        aria-label="数量"
        aria-expanded={open}
      >
        <span>{props.value} 张</span>
      </button>
    </Popover>
  );
}
