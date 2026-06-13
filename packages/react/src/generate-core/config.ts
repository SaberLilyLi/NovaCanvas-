import type { GenerateTransportType } from './types';

export interface GenerateCoreConfig {
  provider: GenerateTransportType;
  polling: {
    interval: number;
    maxRetry: number;
    timeout: number;
  };
}

export const generateCoreConfig: GenerateCoreConfig = {
  provider: 'polling',
  polling: {
    interval: 2000,
    maxRetry: 3,
    timeout: 300000,
  },
};
