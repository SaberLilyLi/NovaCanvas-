import { useMemo } from 'react';
import type { BizType, ImageSize, UploadedImage } from '@novacanvas/types';
import {
  createDefaultImageSizeSettings,
  normalizeRatio,
} from './image-size-settings';
import { NovaComposerInput } from './composer/nova-composer-input';
import type { ComposerReferenceAttachment } from './composer/types';

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

/**
 * @deprecated Use NovaComposerInput. This wrapper is retained for one migration cycle.
 */
export function ComposerInput(props: ComposerInputProps) {
  const imageSizeSettings = useMemo(
    () => createDefaultImageSizeSettings(normalizeRatio(props.ratio)),
    [props.ratio],
  );
  const references = useMemo<ComposerReferenceAttachment[]>(
    () =>
      props.selectedImageIds.flatMap((id) => {
        const image = props.images.find((item) => item.id === id);
        return image
          ? [{ id, name: image.name ?? 'Reference image', previewUrl: image.url }]
          : [];
      }),
    [props.images, props.selectedImageIds],
  );

  return (
    <NovaComposerInput
      value={props.prompt}
      disabled={props.isUploading}
      submitting={props.isSubmitting}
      enableUpload={props.enableUpload}
      enableMultiImage={props.enableMultiImage}
      imageSizeSettings={imageSizeSettings}
      count={props.count}
      referenceAttachments={references}
      onRemoveReference={props.onRemoveReference}
      onValueChange={props.onPromptChange}
      onImageSizeSettingsChange={(settings) => props.onRatioChange(settings.ratio)}
      onCountChange={props.onCountChange}
      onSubmit={async (_value, context) => {
        for (const attachment of context.attachments) {
          await Promise.resolve(props.onUpload(attachment.file));
        }
        props.onSubmit();
      }}
    />
  );
}
