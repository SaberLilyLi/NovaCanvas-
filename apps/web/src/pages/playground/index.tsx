import { NovaCanvasComposer } from '@novacanvas/react';

export function PlaygroundPage() {
  return (
    <NovaCanvasComposer
      bizType="general"
      sceneType="creative"
      enableModelSelector
      enableMultiImage
      enableConversation
      enableImageEdit
      modelConfig={{
        generationModel: 'doubao-seedream-4-0',
      }}
      availableGenerationModels={[
        { label: 'Seedream 4.0', value: 'doubao-seedream-4-0' },
        { label: 'Seedream 4.5', value: 'doubao-seedream-4-5' },
        { label: 'Chat Image 2', value: 'gpt-image-2' },
      ]}
      apiBaseUrl={import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'}
    />
  );
}
