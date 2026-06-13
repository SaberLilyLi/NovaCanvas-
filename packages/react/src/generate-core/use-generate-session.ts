import { useEffect, useMemo, useState } from 'react';
import type { BizType } from '@novacanvas/types';
import type { ImageSizeSessionMeta, ConversationSessionRecord } from '../conversation-session';
import {
  clearConversationSession,
  getConversationSessionStorageKey,
  loadConversationSession,
  saveConversationSession,
} from '../conversation-session';

export interface UseGenerateSessionOptions {
  bizType: BizType;
  userId?: string;
  sceneType?: string;
  conversationId?: string;
  imageSize?: ImageSizeSessionMeta;
  onExternalConversationChange?: (conversationId: string) => void;
  onSessionCleared?: () => void;
}

export function useGenerateSession(options: UseGenerateSessionOptions) {
  const [session, setSession] = useState<ConversationSessionRecord | null>(() =>
    loadConversationSession(options.bizType, options.userId),
  );

  useEffect(() => {
    setSession(loadConversationSession(options.bizType, options.userId));
  }, [options.bizType, options.userId]);

  useEffect(() => {
    if (!options.conversationId) {
      clearConversationSession(options.bizType);
      setSession(null);
      return;
    }

    saveConversationSession({
      conversationId: options.conversationId,
      bizType: options.bizType,
      sceneType: options.sceneType,
      userId: options.userId,
      imageSize: options.imageSize,
    });

    setSession(loadConversationSession(options.bizType, options.userId));
  }, [
    options.bizType,
    options.conversationId,
    options.imageSize,
    options.sceneType,
    options.userId,
  ]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== getConversationSessionStorageKey(options.bizType)) return;

      if (!event.newValue) {
        setSession(null);
        options.onSessionCleared?.();
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as ConversationSessionRecord;
        if (!parsed.conversationId) return;
        setSession(parsed);
        if (parsed.conversationId !== options.conversationId) {
          options.onExternalConversationChange?.(parsed.conversationId);
        }
      } catch {
        // Ignore malformed cross-tab payloads.
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [
    options.bizType,
    options.conversationId,
    options.onExternalConversationChange,
    options.onSessionCleared,
  ]);

  return useMemo(
    () => ({
      session,
      resolveInitialConversationId(urlConversationId: string | null) {
        if (!urlConversationId) return session?.conversationId ?? null;

        if (urlConversationId !== session?.conversationId) {
          saveConversationSession({
            conversationId: urlConversationId,
            bizType: options.bizType,
            sceneType: options.sceneType,
            userId: options.userId,
            imageSize: session?.imageSize,
            batchMetaByGroupId: session?.batchMetaByGroupId,
          });
          setSession(loadConversationSession(options.bizType, options.userId));
        }

        return urlConversationId;
      },
      clear() {
        clearConversationSession(options.bizType);
        setSession(null);
      },
      reload() {
        setSession(loadConversationSession(options.bizType, options.userId));
      },
    }),
    [options.bizType, options.sceneType, options.userId, session],
  );
}
