import { NovaCanvasComposer } from '@novacanvas/react';

export function UsedCarDemoPage() {
  return (
    <NovaCanvasComposer
      bizType="used_car"
      sceneType="creative_poster"
      enableMultiImage
      enableConversation
      enableImageEdit
      apiBaseUrl={import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'}
      metadata={{ industry: 'used-car', demo: true }}
    />
  );
}
