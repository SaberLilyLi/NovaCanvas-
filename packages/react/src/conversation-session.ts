import type { BizType } from '@novacanvas/types';
import type { RatioPreset, ResolutionTier } from './image-size-settings';

const STORAGE_PREFIX = 'novacanvas:conversation-session';

export interface ImageSizeSessionMeta {
  ratioLabel: RatioPreset;
  resolution: ResolutionTier;
}

export interface BatchSessionMeta extends ImageSizeSessionMeta {
  prompt?: string;
}

export interface ConversationSessionRecord {
  conversationId: string;
  bizType: BizType;
  sceneType?: string;
  userId?: string;
  imageSize?: ImageSizeSessionMeta;
  batchMetaByGroupId?: Record<string, BatchSessionMeta>;
  updatedAt: string;
}

export function getConversationSessionStorageKey(bizType: BizType): string {
  return `${STORAGE_PREFIX}:${bizType}`;
}

export function saveConversationSession(record: Omit<ConversationSessionRecord, 'updatedAt'>): void {
  if (typeof window === 'undefined') return;

  const existing = loadConversationSession(record.bizType, record.userId);
  const payload: ConversationSessionRecord = {
    conversationId: record.conversationId,
    bizType: record.bizType,
    sceneType: record.sceneType,
    userId: record.userId,
    imageSize: record.imageSize ?? existing?.imageSize,
    batchMetaByGroupId: {
      ...(existing?.batchMetaByGroupId ?? {}),
      ...(record.batchMetaByGroupId ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(
      getConversationSessionStorageKey(record.bizType),
      JSON.stringify(payload),
    );
  } catch {
    // Ignore quota or privacy mode errors.
  }
}

export function loadConversationSession(
  bizType: BizType,
  userId?: string,
): ConversationSessionRecord | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(getConversationSessionStorageKey(bizType));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ConversationSessionRecord;
    if (!parsed.conversationId || parsed.bizType !== bizType) return null;
    if (userId && parsed.userId && parsed.userId !== userId) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function clearConversationSession(bizType: BizType): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(getConversationSessionStorageKey(bizType));
  } catch {
    // Ignore storage errors.
  }
}

export function saveBatchSessionMeta(
  bizType: BizType,
  groupId: string,
  meta: BatchSessionMeta,
  context: { userId?: string; sceneType?: string; conversationId: string },
): void {
  const existing = loadConversationSession(bizType, context.userId);
  saveConversationSession({
    conversationId: context.conversationId,
    bizType,
    sceneType: context.sceneType,
    userId: context.userId,
    imageSize: {
      ratioLabel: meta.ratioLabel,
      resolution: meta.resolution,
    },
    batchMetaByGroupId: {
      ...(existing?.batchMetaByGroupId ?? {}),
      [groupId]: meta,
    },
  });
}

export function getBatchSessionMeta(
  bizType: BizType,
  groupId: string,
  userId?: string,
): BatchSessionMeta | undefined {
  return loadConversationSession(bizType, userId)?.batchMetaByGroupId?.[groupId];
}
