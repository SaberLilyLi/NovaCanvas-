import type { NovaCanvasClient } from '@novacanvas/sdk';
import { generateCoreConfig, type GenerateCoreConfig } from '../config';
import type { GenerateProvider, GenerateTransportType } from '../types';
import { PollingGenerateProvider } from './polling-provider';
import { SSEGenerateProvider } from './sse-provider';
import { WebSocketGenerateProvider } from './websocket-provider';

export function createGenerateProvider(
  client: NovaCanvasClient,
  providerType: GenerateTransportType = generateCoreConfig.provider,
): GenerateProvider {
  switch (providerType) {
    case 'polling':
      return new PollingGenerateProvider(client, {
        interval: generateCoreConfig.polling.interval,
      });
    case 'sse':
      return new SSEGenerateProvider(client);
    case 'websocket':
    default:
      return new WebSocketGenerateProvider(client);
  }
}

export type { GenerateCoreConfig };
