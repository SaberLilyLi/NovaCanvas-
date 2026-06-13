import { Image } from '@arco-design/web-react';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { GeneratedImage } from '@novacanvas/types';
import { useImagePreviewProps } from './image-preview-download';

export interface GeneratedImageResultProps {
  images: GeneratedImage[];
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  onContinueEdit?: (image: GeneratedImage) => void;
  onRegenerate?: (image: GeneratedImage) => void;
}

function GeneratedImagePreview(props: {
  image: GeneratedImage;
  enableDownload?: boolean;
}) {
  const previewProps = useImagePreviewProps({
    url: props.image.url,
    filename: props.image.name,
    enabled: props.enableDownload !== false,
  });

  return (
    <Image
      className="nova-image-result__preview"
      src={props.image.url}
      alt={`生成结果 ${props.image.imageIndex ?? ''}`}
      preview
      previewProps={previewProps}
    />
  );
}

export function GeneratedImageResult(props: GeneratedImageResultProps) {
  const isSingle = props.images.length === 1;

  return (
    <section
      className={`nova-image-result ${isSingle ? 'nova-image-result--single' : ''}`}
    >
      <div
        className={`nova-image-result__grid ${
          isSingle ? 'nova-image-result__grid--single' : ''
        }`}
      >
        {props.images.map((image) => (
          <article className="nova-image-result__card" key={image.id}>
            {props.images.length > 1 && (
              <span className="nova-image-result__index">
                第 {image.imageIndex ?? '?'} 张
              </span>
            )}
            <GeneratedImagePreview
              image={image}
              enableDownload={props.enableDownload}
            />
            <div className="nova-image-result__actions">
              {props.enableImageEdit !== false && props.onContinueEdit && (
                <button type="button" onClick={() => props.onContinueEdit?.(image)}>
                  <Sparkles size={15} />
                  编辑
                </button>
              )}
              {props.onRegenerate && (
                <button type="button" onClick={() => props.onRegenerate?.(image)}>
                  <RefreshCw size={15} />
                  重新生成
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
