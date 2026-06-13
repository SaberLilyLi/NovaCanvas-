import { useRef } from 'react';
import { Input, Select, Spin } from '@arco-design/web-react';
import { ArrowUp, Plus, X } from 'lucide-react';
import { getBizConfig } from '@novacanvas/biz-config';
import type { BizType, ImageSize, UploadedImage } from '@novacanvas/types';

export interface ComposerInputProps {
  bizType: BizType;
  sceneType: string;
  ratio: string;
  count: number;
  prompt: string;
  selectedImageIds: string[];
  images: UploadedImage[];
  enableUpload?: boolean;
  enableMultiImage?: boolean;
  isUploading: boolean;
  isSubmitting: boolean;
  onPromptChange: (value: string) => void;
  onSceneTypeChange: (value: string) => void;
  onRatioChange: (value: string) => void;
  onCountChange: (value: number) => void;
  onRemoveReference: (imageId: string) => void;
  onUpload: (file: File) => void;
  onSubmit: () => void;
  ratioToSize: (ratio: string) => ImageSize;
}

export function ComposerInput(props: ComposerInputProps) {
  const config = getBizConfig(props.bizType);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="nova-composer__input-shell">
      <div className="nova-composer__input-body">
        {props.enableUpload !== false && (
          <div className="nova-composer__input-attachments">
            {props.selectedImageIds.map((id) => {
              const image = props.images.find((item) => item.id === id);
              return image ? (
                <div className="nova-composer__attachment-thumb" key={id}>
                  <img src={image.url} alt="Reference" />
                  <button type="button" onClick={() => props.onRemoveReference(id)} aria-label="移除参考图">
                    <X size={12} />
                  </button>
                </div>
              ) : null;
            })}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple={props.enableMultiImage !== false}
              hidden
              onChange={(event) => {
                Array.from(event.target.files ?? []).forEach((file) => props.onUpload(file));
                event.target.value = '';
              }}
            />
            <button
              className="nova-composer__upload-slot"
              type="button"
              disabled={props.isUploading}
              onClick={() => fileInputRef.current?.click()}
              aria-label="上传参考图"
            >
              {props.isUploading ? <Spin size={18} /> : <Plus size={20} strokeWidth={1.75} />}
            </button>
          </div>
        )}
        <Input.TextArea
          className="nova-composer__textarea"
          value={props.prompt}
          onChange={props.onPromptChange}
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder="输入想法或上传参考，描述你想生成或继续修改的画面..."
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              props.onSubmit();
            }
          }}
        />
      </div>
      <div className="nova-composer__toolbar">
        <div className="nova-composer__toolbar-pills">
          <Select
            value={props.ratio}
            onChange={props.onRatioChange}
            size="small"
            className="nova-composer__pill-select"
            triggerProps={{ autoAlignPopupWidth: false }}
          >
            {config.defaultRatioOptions.map((item) => (
              <Select.Option value={item} key={item}>
                {item}
              </Select.Option>
            ))}
          </Select>
          <Select
            value={props.count}
            onChange={props.onCountChange}
            size="small"
            className="nova-composer__pill-select nova-composer__pill-select--count"
          >
            {[1, 2, 3, 4].map((item) => (
              <Select.Option value={item} key={item}>
                {item} 张
              </Select.Option>
            ))}
          </Select>
        </div>
        <button
          className="nova-composer__send-button"
          type="button"
          disabled={props.isSubmitting || !props.prompt.trim()}
          onClick={props.onSubmit}
          aria-label="生成"
        >
          {props.isSubmitting ? <Spin size={16} /> : <ArrowUp size={18} strokeWidth={2.25} />}
        </button>
      </div>
    </div>
  );
}
