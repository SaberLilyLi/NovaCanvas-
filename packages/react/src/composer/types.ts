export type ComposerAttachmentStatus = 'processing' | 'ready' | 'error';

export interface ComposerAttachment {
  id: string;
  type: 'image';
  file: File;
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  status: ComposerAttachmentStatus;
  errorMessage?: string;
}

export interface ComposerSubmitContext {
  attachments: ComposerAttachment[];
}

export interface ComposerReferenceAttachment {
  id: string;
  name: string;
  previewUrl: string;
}
