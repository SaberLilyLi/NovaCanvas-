import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComposerAttachment } from './types';

const DEFAULT_ACCEPT = ['image/*'];
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_ATTACHMENTS = 9;

export interface UseComposerAttachmentsOptions {
  accept?: string[];
  enabled?: boolean;
  multiple?: boolean;
  maxAttachments?: number;
  maxFileSize?: number;
  onError?: (message: string, file?: File) => void;
}

export interface UseComposerAttachmentsResult {
  attachments: ComposerAttachment[];
  addFiles: (files: File[]) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  retryAttachment: (id: string) => void;
  hasProcessingAttachment: boolean;
  hasErrorAttachment: boolean;
}

function matchesAccept(file: File, accept: string[]): boolean {
  return accept.some((rule) => {
    const normalized = rule.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === '*/*') return true;
    if (normalized.endsWith('/*')) {
      return file.type.toLowerCase().startsWith(normalized.slice(0, -1));
    }
    if (normalized.startsWith('.')) {
      return file.name.toLowerCase().endsWith(normalized);
    }
    return file.type.toLowerCase() === normalized;
  });
}

function fileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

function createAttachment(file: File): ComposerAttachment {
  return {
    id: `attachment-${Date.now()}-${crypto.randomUUID()}`,
    type: 'image',
    file,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    previewUrl: URL.createObjectURL(file),
    status: 'ready',
  };
}

export function useComposerAttachments(
  options: UseComposerAttachmentsOptions = {},
): UseComposerAttachmentsResult {
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const accept = options.accept ?? DEFAULT_ACCEPT;
  const enabled = options.enabled !== false;
  const multiple = options.multiple !== false;
  const maxAttachments = Math.max(1, options.maxAttachments ?? DEFAULT_MAX_ATTACHMENTS);
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

  const revoke = useCallback((attachment: ComposerAttachment) => {
    URL.revokeObjectURL(attachment.previewUrl);
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments((current) => {
      current.forEach(revoke);
      return [];
    });
  }, [revoke]);

  const removeAttachment = useCallback(
    (id: string) => {
      setAttachments((current) => {
        const removed = current.find((attachment) => attachment.id === id);
        if (removed) revoke(removed);
        return current.filter((attachment) => attachment.id !== id);
      });
    },
    [revoke],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      if (!enabled || files.length === 0) return;

      setAttachments((current) => {
        const next = multiple ? [...current] : [];
        if (!multiple) current.forEach(revoke);

        const fingerprints = new Set(next.map((item) => fileFingerprint(item.file)));
        const candidates = multiple ? files : files.slice(-1);

        for (const file of candidates) {
          if (next.length >= maxAttachments) {
            options.onError?.(`最多可添加 ${maxAttachments} 张图片`, file);
            break;
          }
          if (!matchesAccept(file, accept)) {
            options.onError?.(`不支持的文件类型：${file.type || file.name}`, file);
            continue;
          }
          if (file.size > maxFileSize) {
            options.onError?.(
              `图片 ${file.name} 超过 ${(maxFileSize / (1024 * 1024)).toFixed(0)} MB`,
              file,
            );
            continue;
          }

          const fingerprint = fileFingerprint(file);
          if (fingerprints.has(fingerprint)) {
            options.onError?.(`图片 ${file.name} 已添加`, file);
            continue;
          }

          fingerprints.add(fingerprint);
          next.push(createAttachment(file));
        }

        return next;
      });
    },
    [accept, enabled, maxAttachments, maxFileSize, multiple, options, revoke],
  );

  const retryAttachment = useCallback((id: string) => {
    setAttachments((current) =>
      current.map((attachment) =>
        attachment.id === id
          ? { ...attachment, status: 'ready', errorMessage: undefined }
          : attachment,
      ),
    );
  }, []);

  useEffect(
    () => () => {
      attachmentsRef.current.forEach(revoke);
    },
    [revoke],
  );

  return useMemo(
    () => ({
      attachments,
      addFiles,
      removeAttachment,
      clearAttachments,
      retryAttachment,
      hasProcessingAttachment: attachments.some(
        (attachment) => attachment.status === 'processing',
      ),
      hasErrorAttachment: attachments.some((attachment) => attachment.status === 'error'),
    }),
    [addFiles, attachments, clearAttachments, removeAttachment, retryAttachment],
  );
}
