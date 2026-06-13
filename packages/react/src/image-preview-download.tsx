import type { ImagePreviewActionProps, ImagePreviewProps } from '@arco-design/web-react/es/Image/interface';
import { Download } from 'lucide-react';
import { useMemo } from 'react';

const DEFAULT_PREVIEW_ACTIONS_LAYOUT = [
  'fullScreen',
  'rotateRight',
  'rotateLeft',
  'zoomIn',
  'zoomOut',
  'originalSize',
  'download',
] as const;

function inferFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const basename = pathname.split('/').filter(Boolean).pop();
    if (basename) return basename;
  } catch {
    // ignore invalid url
  }
  return `nova-image-${Date.now()}.png`;
}

export async function downloadImageFile(url: string, filename?: string): Promise<void> {
  const resolvedName = filename?.trim() || inferFilenameFromUrl(url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = resolvedName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    return;
  } catch {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = resolvedName;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.click();
  }
}

export function createImagePreviewDownloadAction(input: {
  url: string;
  filename?: string;
}): ImagePreviewActionProps {
  return {
    key: 'download',
    name: '下载',
    content: <Download size={18} aria-hidden />,
    onClick: () => {
      void downloadImageFile(input.url, input.filename);
    },
  };
}

export function createImagePreviewProps(input: {
  url: string;
  filename?: string;
  enabled?: boolean;
}): Partial<ImagePreviewProps> {
  if (input.enabled === false) {
    return {};
  }

  return {
    actions: [createImagePreviewDownloadAction(input)],
    actionsLayout: [...DEFAULT_PREVIEW_ACTIONS_LAYOUT],
  };
}

export function useImagePreviewProps(input: {
  url?: string;
  filename?: string;
  enabled?: boolean;
}): Partial<ImagePreviewProps> {
  return useMemo(
    () =>
      input.url
        ? createImagePreviewProps({
            url: input.url,
            filename: input.filename,
            enabled: input.enabled,
          })
        : {},
    [input.enabled, input.filename, input.url],
  );
}
