import { NovaCanvasComposer } from '@novacanvas/react';

export function PlaygroundPage() {
  return (
    <NovaCanvasComposer
      bizType="general"
      sceneType="creative"
      enableMultiImage
      enableConversation
      enableImageEdit
      apiBaseUrl={import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'}
    />
  );
}
