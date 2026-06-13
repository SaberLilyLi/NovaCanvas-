import { useEffect, useRef, useState } from 'react';
import type { NovaCanvasConnectionStatus, NovaCanvasSocketEvent } from '@novacanvas/sdk';
import { useNovaCanvasClient } from './provider';

export interface UseConversationRealtimeOptions {
  conversationId: string;
  enabled?: boolean;
  onEvent: (event: NovaCanvasSocketEvent) => void;
  onReconcile: () => void;
}

export function useConversationRealtime(options: UseConversationRealtimeOptions) {
  const client = useNovaCanvasClient();
  const [connectionStatus, setConnectionStatus] =
    useState<NovaCanvasConnectionStatus>('disconnected');
  const onEventRef = useRef(options.onEvent);
  const onReconcileRef = useRef(options.onReconcile);

  onEventRef.current = options.onEvent;
  onReconcileRef.current = options.onReconcile;

  useEffect(() => {
    if (!options.conversationId || options.enabled === false) {
      setConnectionStatus('disconnected');
      return;
    }

    return client.connectConversation(
      options.conversationId,
      (event) => onEventRef.current(event),
      setConnectionStatus,
      () => onReconcileRef.current(),
    );
  }, [client, options.conversationId, options.enabled]);

  useEffect(() => {
    if (!options.conversationId || options.enabled === false) return;

    const reconcile = () => onReconcileRef.current();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') reconcile();
    };

    const handleOnline = () => reconcile();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [options.conversationId, options.enabled]);

  return { connectionStatus };
}
