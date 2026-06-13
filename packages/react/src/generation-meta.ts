import { getResolutionLabel, type ResolutionTier } from './image-size-settings';

export function formatGenerationMeta(ratioLabel: string, resolution: ResolutionTier): string {
  return `图片 3.0 | ${ratioLabel} | ${getResolutionLabel(resolution)}`;
}

export function formatGenerationHeader(
  prompt: string,
  ratioLabel: string,
  resolution: ResolutionTier,
  actionLabel?: string,
): string {
  const lead = actionLabel ? `${actionLabel} ${prompt}` : prompt;
  return `${lead} ${formatGenerationMeta(ratioLabel, resolution)}`;
}
