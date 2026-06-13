export const IMAGE_SIZE_GRID = 16;
export const IMAGE_SIZE_MIN_PIXELS = 655_360;
export const IMAGE_SIZE_MAX_PIXELS = 8_294_400;
export const IMAGE_SIZE_MAX_EDGE = 3840;
export const IMAGE_SIZE_MAX_RATIO = 3;

export type ImageResolutionCap = '1k' | '2k' | '4k';
export type ImageSize = 'auto' | `${number}x${number}`;

export const IMAGE_MAX_LONG_EDGE_BY_CAP: Record<ImageResolutionCap, number> = {
  '1k': 1536,
  '2k': 2048,
  '4k': 3840,
};

const SIZE_PATTERN = /^(\d+)x(\d+)$/;

export function roundToImageGrid(value: number): number {
  return Math.max(IMAGE_SIZE_GRID, Math.round(value / IMAGE_SIZE_GRID) * IMAGE_SIZE_GRID);
}

export function parseImageSize(size: string): { width: number; height: number } | null {
  const match = SIZE_PATTERN.exec(size);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

export function formatImageSize(width: number, height: number): `${number}x${number}` {
  return `${width}x${height}`;
}

export function normalizeImageDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  let w = roundToImageGrid(width);
  let h = roundToImageGrid(height);

  const maxEdge = Math.max(w, h);
  if (maxEdge > IMAGE_SIZE_MAX_EDGE) {
    const scale = IMAGE_SIZE_MAX_EDGE / maxEdge;
    w = roundToImageGrid(w * scale);
    h = roundToImageGrid(h * scale);
  }

  const longEdge = Math.max(w, h);
  const shortEdge = Math.min(w, h);
  if (shortEdge > 0 && longEdge / shortEdge > IMAGE_SIZE_MAX_RATIO) {
    const adjustedShort = roundToImageGrid(longEdge / IMAGE_SIZE_MAX_RATIO);
    if (w >= h) h = adjustedShort;
    else w = adjustedShort;
  }

  let pixels = w * h;
  if (pixels < IMAGE_SIZE_MIN_PIXELS) {
    const scale = Math.sqrt(IMAGE_SIZE_MIN_PIXELS / pixels);
    w = roundToImageGrid(w * scale);
    h = roundToImageGrid(h * scale);
    pixels = w * h;
  }

  if (pixels > IMAGE_SIZE_MAX_PIXELS) {
    const scale = Math.sqrt(IMAGE_SIZE_MAX_PIXELS / pixels);
    w = roundToImageGrid(w * scale);
    h = roundToImageGrid(h * scale);
  }

  return { width: w, height: h };
}

export function normalizeImageSize(size: string): ImageSize {
  if (size === 'auto') return 'auto';
  const parsed = parseImageSize(size);
  if (!parsed) return '1024x1024';
  const normalized = normalizeImageDimensions(parsed.width, parsed.height);
  return formatImageSize(normalized.width, normalized.height);
}

export function isValidImageSize(size: string): size is ImageSize {
  if (size === 'auto') return true;
  const parsed = parseImageSize(size);
  if (!parsed) return false;
  const normalized = normalizeImageDimensions(parsed.width, parsed.height);
  return (
    parsed.width === normalized.width &&
    parsed.height === normalized.height &&
    parsed.width % IMAGE_SIZE_GRID === 0 &&
    parsed.height % IMAGE_SIZE_GRID === 0 &&
    Math.max(parsed.width, parsed.height) <= IMAGE_SIZE_MAX_EDGE &&
    parsed.width * parsed.height >= IMAGE_SIZE_MIN_PIXELS &&
    parsed.width * parsed.height <= IMAGE_SIZE_MAX_PIXELS &&
    Math.max(parsed.width, parsed.height) / Math.min(parsed.width, parsed.height) <= IMAGE_SIZE_MAX_RATIO
  );
}

export function resolveImageDimensions(size: ImageSize): { width: number; height: number } {
  if (size === 'auto') return { width: 1024, height: 1024 };
  const parsed = parseImageSize(size);
  if (!parsed) return { width: 1024, height: 1024 };
  return normalizeImageDimensions(parsed.width, parsed.height);
}

export function parseImageResolutionCap(value?: string | null): ImageResolutionCap {
  if (value === '2k' || value === '4k') return value;
  return '1k';
}

const IMAGE_RESOLUTION_CAP_RANK: Record<ImageResolutionCap, number> = {
  '1k': 1,
  '2k': 2,
  '4k': 3,
};

export function maxImageResolutionCap(...caps: ImageResolutionCap[]): ImageResolutionCap {
  return caps.reduce(
    (best, cap) => (IMAGE_RESOLUTION_CAP_RANK[cap] > IMAGE_RESOLUTION_CAP_RANK[best] ? cap : best),
    '1k',
  );
}

export function capImageDimensions(
  width: number,
  height: number,
  maxLongEdge: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) return normalizeImageDimensions(width, height);
  const scale = maxLongEdge / longEdge;
  return normalizeImageDimensions(width * scale, height * scale);
}

export function capImageSize(size: ImageSize, maxCap: ImageResolutionCap): ImageSize {
  if (size === 'auto') return size;
  const parsed = parseImageSize(size);
  if (!parsed) return size;
  const capped = capImageDimensions(
    parsed.width,
    parsed.height,
    IMAGE_MAX_LONG_EDGE_BY_CAP[maxCap],
  );
  return formatImageSize(capped.width, capped.height);
}
