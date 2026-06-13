import { NovaCanvasComposer } from '@novacanvas/react';

export function FashionDemoPage() {
  return (
    <NovaCanvasComposer
      bizType="fashion"
      sceneType="inspiration"
      enableMultiImage
      enableConversation
      enableImageEdit
      apiBaseUrl={import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'}
      metadata={{ industry: 'fashion', demo: true }}
    />
  );
}
