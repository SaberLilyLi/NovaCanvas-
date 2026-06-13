import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStore } from 'zustand';
import type { BizType } from '@novacanvas/types';
import {
  createNovaCanvasClient,
  type NovaCanvasClient,
  type NovaCanvasClientOptions,
} from '@novacanvas/sdk';
import { createNovaCanvasStore, type NovaCanvasStore } from './store';

interface NovaCanvasContextValue {
  client: NovaCanvasClient;
  store: ReturnType<typeof createNovaCanvasStore>;
}

const NovaCanvasContext = createContext<NovaCanvasContextValue | null>(null);

export interface NovaCanvasProviderProps extends NovaCanvasClientOptions {
  bizType: BizType;
  sceneType?: string;
}

export function NovaCanvasProvider({
  children,
  bizType,
  sceneType,
  baseUrl,
  authToken,
}: PropsWithChildren<NovaCanvasProviderProps>) {
  const queryClientRef = useRef(new QueryClient());
  const clientRef = useRef(createNovaCanvasClient({ baseUrl, authToken }));
  const storeRef = useRef(createNovaCanvasStore(bizType, sceneType));

  useEffect(() => {
    storeRef.current.getState().reset(bizType, sceneType);
  }, [bizType, sceneType]);

  useEffect(() => {
    clientRef.current = createNovaCanvasClient({ baseUrl, authToken });
  }, [baseUrl, authToken]);

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <NovaCanvasContext.Provider value={{ client: clientRef.current, store: storeRef.current }}>
        {children}
      </NovaCanvasContext.Provider>
    </QueryClientProvider>
  );
}

export function useNovaCanvas<T = NovaCanvasStore>(
  selector: (state: NovaCanvasStore) => T = (state) => state as T,
): T {
  const context = useContext(NovaCanvasContext);
  if (!context) throw new Error('useNovaCanvas must be used inside NovaCanvasProvider');
  return useStore(context.store, selector);
}

export function useNovaCanvasClient() {
  const context = useContext(NovaCanvasContext);
  if (!context) throw new Error('useNovaCanvasClient must be used inside NovaCanvasProvider');
  return context.client;
}
