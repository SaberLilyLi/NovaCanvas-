import type { GeneratedImage } from '@novacanvas/types';

export const IMAGE_OPTIMIZE_PROMPT =
  '优化这张图片，提升画面细节、质感与整体质量';

export interface GenerationImageActionContext {
  turnPrompt: string;
}

export type GenerationImageActionHandler = (
  image: GeneratedImage,
  context: GenerationImageActionContext,
) => void;
