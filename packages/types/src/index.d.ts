export type BizType = 'general' | 'used_car' | 'fashion' | 'ecommerce' | 'poster';
export type CanvasMode = 'text-to-image' | 'image-to-image' | 'chat-image' | 'full';
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type TaskType = 'text_to_image' | 'image_to_image' | 'text_image_to_image' | 'image_chat' | 'unknown';
export type GenerationMode = 'parallel' | 'serial';
export type ImageType = 'uploaded' | 'generated';
export type MessageRole = 'user' | 'assistant' | 'system';
export interface UploadedImage {
    id: string;
    url: string;
    type: ImageType;
    name?: string;
    createdAt: string;
}
export interface GeneratedImage extends UploadedImage {
    type: 'generated';
    prompt?: string;
    sourceImageIds?: string[];
    width?: number;
    height?: number;
}
export interface ConversationMessage {
    id: string;
    role: MessageRole;
    content: string;
    imageIds?: string[];
    taskIds?: string[];
    createdAt: string;
}
export interface GenerationTask {
    id: string;
    status: TaskStatus;
    progress: number;
    taskType: TaskType;
    prompt: string;
    inputImageIds?: string[];
    resultImageId?: string;
    resultImage?: GeneratedImage;
    errorMessage?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface ConversationState {
    conversationId: string;
    bizType: BizType;
    sceneType?: string;
    messages: ConversationMessage[];
    images: UploadedImage[];
    tasks: GenerationTask[];
    latestImageId?: string;
}
export interface GenerationPlanTask {
    index: number;
    prompt: string;
    inputImageIds: string[];
    size: ImageSize;
    dependsOnIndex?: number;
}
export interface GenerationPlan {
    taskType: TaskType;
    imageCount: number;
    generationMode: GenerationMode;
    useHistoryImage: boolean;
    useUploadedImages: boolean;
    needGenerate: boolean;
    tasks: GenerationPlanTask[];
}
export type ImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
export interface CreateGenerationInput {
    conversationId?: string;
    userId?: string;
    bizType: BizType;
    sceneType?: string;
    model?: string;
    prompt: string;
    imageIds?: string[];
    selectedImageId?: string;
    count?: number;
    size?: ImageSize;
    metadata?: Record<string, unknown>;
    regenerateFromPrompt?: string;
}
export interface PromptSuggestion {
    title: string;
    prompt: string;
}
export interface PromptSuggestionsInput {
    bizType: BizType;
    sceneType?: string;
    model?: string;
    lastUserPrompt: string;
}
export interface PromptSuggestionsResponse {
    suggestions: PromptSuggestion[];
}
export interface CreateGenerationResponse {
    conversationId: string;
    tasks: Array<Pick<GenerationTask, 'id' | 'status'>>;
}
