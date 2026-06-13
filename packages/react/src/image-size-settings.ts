import {
  capImageDimensions,
  formatImageSize,
  IMAGE_MAX_LONG_EDGE_BY_CAP,
  normalizeImageDimensions,
  type ImageResolutionCap,
  type ImageSize,
} from '@novacanvas/types';

export const RATIO_PRESETS = ['21:9', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16'] as const;

export type RatioPreset = (typeof RATIO_PRESETS)[number];
export type ResolutionTier = '1k' | '2k';

export interface ImageSizeSettings {
  ratio: RatioPreset;
  resolution: ResolutionTier;
  width: number;
  height: number;
  linked: boolean;
}

const BASE_1K = 1328;

export const RESOLUTION_OPTIONS: Array<{ value: ResolutionTier; label: string }> = [
  { value: '1k', label: '标清 1K' },
  { value: '2k', label: '高清 2K' },
];

export function getResolutionLabel(resolution: ResolutionTier): string {
  return resolution === '2k' ? '高清 2K' : '标清 1K';
}

export function getDimensionsForRatio(
  ratio: RatioPreset,
  resolution: ResolutionTier,
): { width: number; height: number } {
  const scale = resolution === '2k' ? 2 : 1;
  const [ratioWidth, ratioHeight] = ratio.split(':').map(Number);
  if (!ratioWidth || !ratioHeight) {
    const edge = BASE_1K * scale;
    return normalizeImageDimensions(edge, edge);
  }

  if (ratioWidth >= ratioHeight) {
    const width = BASE_1K * scale;
    return normalizeImageDimensions(width, Math.round((BASE_1K * ratioHeight * scale) / ratioWidth));
  }

  const height = BASE_1K * scale;
  return normalizeImageDimensions(Math.round((BASE_1K * ratioWidth * scale) / ratioHeight), height);
}

export function createDefaultImageSizeSettings(
  ratio: RatioPreset = '1:1',
  resolution: ResolutionTier = '1k',
): ImageSizeSettings {
  const { width, height } = getDimensionsForRatio(ratio, resolution);
  return { ratio, resolution, width, height, linked: true };
}

export function settingsToImageSize(settings: ImageSizeSettings): ImageSize {
  const { width, height } = normalizeImageDimensions(settings.width, settings.height);
  return formatImageSize(width, height);
}

export function dimensionsToImageSize(width: number, height: number): ImageSize {
  const normalized = normalizeImageDimensions(width, height);
  return formatImageSize(normalized.width, normalized.height);
}

export function normalizeRatio(value: string): RatioPreset {
  return (RATIO_PRESETS as readonly string[]).includes(value) ? (value as RatioPreset) : '1:1';
}

const RESOLUTION_RANK: Record<ResolutionTier, number> = {
  '1k': 1,
  '2k': 2,
};

const CAP_RANK: Record<ImageResolutionCap, number> = {
  '1k': 1,
  '2k': 2,
  '4k': 3,
};

export function getAvailableResolutionOptions(maxCap: ImageResolutionCap = '2k') {
  return RESOLUTION_OPTIONS.filter(
    (option) => RESOLUTION_RANK[option.value] <= CAP_RANK[maxCap],
  );
}

export function clampSettingsToMaxResolution(
  settings: ImageSizeSettings,
  maxCap: ImageResolutionCap,
): ImageSizeSettings {
  const resolution =
    RESOLUTION_RANK[settings.resolution] > CAP_RANK[maxCap] ? '1k' : settings.resolution;
  const dims = getDimensionsForRatio(settings.ratio, resolution);
  const capped = capImageDimensions(
    dims.width,
    dims.height,
    IMAGE_MAX_LONG_EDGE_BY_CAP[maxCap],
  );
  return { ...settings, resolution, ...capped, linked: settings.linked };
}
