# NovaCanvas React 组件封装与原输入框迁移规范（V2）

> 项目：NovaCanvas AI  
> 仓库：`https://github.com/SaberLilyLi/NovaCanvas-.git`  
> 基线分支：`main`  
> 文档用途：交由 Codex 执行“前端组件封装、移除 `@company/ai-studio-sdk` 强依赖、输出可被其他 React 项目直接使用的组件包”  
> 建议执行工具：**Codex**  
> 后续具体业务项目的 UI 接入与微调：**Cursor**  
> 审计日期：2026-06-13  
> V2 变更：明确保留原输入框的视觉、动画和交互；原 `ComposerInput` 本轮改为兼容包装器，不直接删除。

---

## 1. 本轮重构目标

本轮只处理 NovaCanvas 前端组件包的封装问题，核心目标如下：

1. 从 `@novacanvas/react` 中彻底移除 `@company/ai-studio-sdk` 强依赖。
2. 将输入框、附件管理、消息展示改为 NovaCanvas 自己维护的组件和类型。
3. 收敛当前并存的两套输入区、两套消息展示实现。
4. 打通生成图片的单图选择、`selectedImageId`、继续编辑与重新生成交互。
5. 将 `@novacanvas/react` 从 Monorepo 源码包升级为具有正式 `dist` 产物的组件包。
6. 确保该组件能被二手车、服装等其他 React 项目直接引用。
7. 确保组件不依赖宿主项目的 Tailwind 编译、不污染宿主样式、不打包重复 React。

本轮完成后，应能够在外部 React 项目中使用：

```tsx
import { NovaCanvasComposer } from '@novacanvas/react';
import '@novacanvas/react/styles.css';

export function UsedCarCreativeImage() {
  return (
    <NovaCanvasComposer
      bizType="used_car"
      sceneType="creative_poster"
      apiBaseUrl="https://image-api.example.com"
      enableMultiImage
      enableImageEdit
      enableConversation
    />
  );
}
```

服装项目只需要改变业务参数：

```tsx
<NovaCanvasComposer
  bizType="fashion"
  sceneType="inspiration"
  apiBaseUrl="https://image-api.example.com"
  enableMultiImage
  enableImageEdit
  enableConversation
/>
```

---

## 1.1 原输入框处理结论（强制要求）

本轮封装不是废弃或重做用户之前已经完成的输入框，而是将其能力迁移为 NovaCanvas 自己维护的正式组件。

最终状态必须是：

```txt
NovaComposerInput        唯一真实实现
ComposerInput            临时兼容包装器（保留旧 Props）
AiComposer               完全移除
```

### 必须保留的原输入框能力

Codex 在修改前必须先从当前代码中列出原输入框已经具备的全部能力，并建立迁移核对表。至少包括：

- 默认收起、聚焦展开、失焦收起的尺寸动画。
- 输入内容或存在附件时保持展开。
- 生成中状态与禁用状态。
- 多图选择、拖拽上传、剪贴板粘贴。
- 图片本地预览、堆叠展示、Hover 展开、删除和排序（当前已实现的部分必须保留）。
- 比例、数量、模型、积分等工具栏能力。
- 日间 / 夜间主题。
- H5 布局与安全区域适配。
- Enter 发送、Shift + Enter 换行及中文输入法组合事件处理。
- 当前错误提示、文件类型和大小校验。

除非现有行为本身是明确缺陷，否则不得以“重新封装”为理由删除、简化或改变上述交互。

### 迁移原则

1. 先建立 `NovaComposerInput`，再迁移原输入框 DOM、样式、动画与附件逻辑。
2. 新组件稳定前，不删除原 `composer-input.tsx`。
3. 原 `composer-input.tsx` 改造成兼容包装器，继续接收旧 Props，并在内部调用 `NovaComposerInput`。
4. 旧页面与旧调用点必须在不改业务逻辑的情况下继续工作。
5. 所有正式页面迁移完成后，仅标记旧导出为 `@deprecated`；本轮仍不删除。
6. 删除兼容包装器属于后续独立版本任务，不包含在本轮。

### 兼容包装器示意

```tsx
/** @deprecated 请改用 NovaComposerInput */
export function ComposerInput(props: LegacyComposerInputProps) {
  return (
    <NovaComposerInput
      value={props.prompt}
      onValueChange={props.onPromptChange}
      disabled={props.loading}
      initialImageIds={props.selectedImageIds}
      onSubmit={({ value, attachments }) => {
        props.onSubmit?.({
          prompt: value,
          attachments,
        });
      }}
    />
  );
}
```

兼容层只做 Props 映射，禁止复制一套新的输入框状态和样式。

---

## 2. 本轮明确不处理的范围

为降低回归风险，本轮禁止同时处理以下内容：

- Seedream 图生图参数与参考图传递。
- GPT Image 2 多图参考能力。
- DeepSeek Prompt 规划逻辑。
- NestJS 后端任务重试持久化。
- BullMQ、Redis、Prisma 调整。
- 二手车或服装业务页面整体 UI 重做。
- 积分、登录、权限、订单等业务系统接入。
- Vue 组件封装。

这些内容必须在本轮组件封装完成、测试通过后单独处理。

---

## 3. 当前代码审计结论

### 3.1 当前组件包仍然依赖外部 SDK

当前 `packages/react/package.json` 直接声明：

```json
"@company/ai-studio-sdk": "workspace:*"
```

组件包的入口仍然指向源码：

```json
{
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./styles.css": "./src/styles.scss"
  }
}
```

这意味着当前 `@novacanvas/react` 只是 Monorepo 内部源码包，并非可被外部项目稳定安装的正式组件包。

### 3.2 当前真正依赖 SDK 的核心文件

已确认至少包含：

```txt
packages/react/src/ai-studio-conversation.tsx
packages/react/src/image-composer-page.tsx
packages/react/src/generate-core/use-generate-controller.ts
packages/react/src/nova-conversation-view.tsx
packages/react/src/build-conversation-items.ts
packages/react/src/map-sdk-messages.ts
packages/react/src/styles.scss
packages/react/package.json
```

依赖内容主要集中在：

- `AiComposer`
- `ComposerAttachment`
- SDK `Message`
- `@company/ai-studio-sdk/styles.css`
- SDK 内部生成的 DOM 层级与工具类名

### 3.3 当前存在两套输入区实现

当前主链路使用：

```txt
AiStudioConversation
└── @company/ai-studio-sdk/AiComposer
```

仓库中同时存在旧的本地实现：

```txt
ComposerInput
```

两套实现的状态模型不同：

- SDK 输入框：附件先保存在前端，发送时由 Controller 上传。
- 本地旧输入框：选择文件后直接触发 `onUpload`，并同时包含比例、数量和场景控制。

因此，不能直接将旧 `ComposerInput` 原样替换 `AiComposer`，否则会改变上传时机、重置行为、附件状态和发送链路。

### 3.4 当前存在两套消息展示实现

当前主要使用：

```txt
NovaConversationView
GenerationTurnCard
GenerationSlotGrid
GenerationTurnFooter
```

仓库还保留：

```txt
MessageList
GeneratedImageResult
map-sdk-messages.ts
```

其中 `build-conversation-items.ts` 与 `map-sdk-messages.ts` 职责存在重叠。最终必须只保留一套正式对话展示链路。

### 3.5 当前消息类型仍带有 SDK 语义

`NovaConversationItem` 当前包含：

```ts
{
  type: 'sdk';
  message: Message;
}
```

渲染函数名仍为：

```ts
SdkMessageBubble
```

这会让 NovaCanvas 的内部展示结构继续被外部 SDK 类型绑定。

### 3.6 当前 SCSS 高度依赖 SDK 内部 DOM

当前 `styles.scss` 中存在大量依赖 SDK DOM 的选择器，例如：

```scss
> [data-theme] > .mt-auto
> [data-theme] > .mt-4.grid
> [data-theme] > .relative.z-0
button[aria-label='Send']
.flex.w-full
.nova-composer__composer-toolbar-inject
```

同时模型、尺寸、数量和积分等控件通过绝对定位注入到第三方输入框中。这种实现：

- 对 SDK DOM 变化非常敏感。
- 嵌入其他项目后容易错位。
- 容易造成输入框覆盖内容、长截图重复、H5 变形。
- 很难控制样式作用域。

### 3.7 当前生成图无法可靠选择后继续编辑

`GenerationSlotGrid` 当前主要处理：

- 图片展示
- 预览
- 下载
- 失败状态
- Loading 状态

但没有正式接入：

```ts
selectedImageId
onSelectImage
onContinueEditImage
```

`GenerationTurnFooter` 的“重新编辑”只传递 `turnPrompt`，没有传递具体 `imageId`。

当一轮生成四张图时，系统无法仅依靠 Footer 判断用户要编辑第几张。

### 3.8 Store 已经具备选择图片的基础字段

当前共享状态中已经存在：

```ts
latestImageId?: string;
selectedImageId?: string;
latestResultGroupId?: string;
```

Store 也已经提供：

```ts
setSelectedImageId(imageId?: string)
setLatestImageId(imageId?: string)
```

因此本轮无需重做状态模型，重点是将结果图点击、单图操作与 Store 真正连接起来。

---

## 4. 重构后的目标架构

```txt
packages/react/
├── src/
│   ├── composer/
│   │   ├── nova-composer-input.tsx
│   │   ├── composer-attachment-list.tsx
│   │   ├── composer-file-picker.tsx
│   │   ├── composer-textarea.tsx
│   │   ├── composer-toolbar.tsx
│   │   ├── composer-send-button.tsx
│   │   ├── use-composer-attachments.ts
│   │   ├── attachment-validation.ts
│   │   └── types.ts
│   ├── conversation/
│   │   ├── nova-canvas-conversation.tsx
│   │   ├── nova-conversation-view.tsx
│   │   ├── conversation-message-bubble.tsx
│   │   ├── build-conversation-items.ts
│   │   └── types.ts
│   ├── generation/
│   │   ├── generation-turn-card.tsx
│   │   ├── generation-slot-grid.tsx
│   │   ├── generation-slot-actions.tsx
│   │   ├── generation-turn-footer.tsx
│   │   └── generation-slots.ts
│   ├── generate-core/
│   ├── provider.tsx
│   ├── store.ts
│   ├── image-composer-page.tsx
│   ├── index.ts
│   └── styles/
│       ├── index.scss
│       ├── tokens.scss
│       ├── composer.scss
│       ├── conversation.scss
│       ├── generation.scss
│       └── responsive.scss
├── vite.config.ts
├── package.json
└── tsconfig.json
```

说明：

- 不要求机械地一次移动所有现有文件。
- 可以先新增目录和兼容导出，再分阶段迁移。
- 最终必须保证公开入口清晰、内部组件边界明确。

---

## 5. 本地输入组件设计

### 5.1 新组件名称

新增：

```txt
NovaComposerInput
```

主链路最终统一为：

```txt
NovaCanvasConversation
├── NovaConversationView
└── NovaComposerInput
```

原 `AiStudioConversation` 完成迁移后改名或删除。

### 5.2 浏览器附件类型

附件类型应放在 React 包内部，而不是放到通用 `@novacanvas/types`。

原因：

- `File` 属于浏览器环境。
- `previewUrl` 通常是 Object URL。
- 后端与 Node SDK 不应依赖 DOM 类型。

新增：

```ts
// packages/react/src/composer/types.ts

export type ComposerAttachmentStatus =
  | 'processing'
  | 'ready'
  | 'error';

export interface ComposerAttachment {
  id: string;
  type: 'image';
  file: File;
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string;
  status: ComposerAttachmentStatus;
  errorMessage?: string;
}

export interface ComposerSubmitContext {
  attachments: ComposerAttachment[];
}
```

### 5.3 保持现有上传时机

新输入框必须保持当前主链路行为：

1. 用户选择文件。
2. 本地生成预览。
3. 附件状态变为 `ready`。
4. 用户点击发送。
5. `useGenerateController.submit` 在发送阶段调用 `client.uploadImage`。
6. 上传成功后将 `imageId` 加入生成请求。

不要改成“用户选择文件立即上传”，除非未来单独设计预上传方案。

### 5.4 附件 Hook

新增：

```ts
useComposerAttachments(options)
```

建议返回：

```ts
interface UseComposerAttachmentsResult {
  attachments: ComposerAttachment[];
  addFiles: (files: File[]) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  retryAttachment: (id: string) => void;
  hasProcessingAttachment: boolean;
  hasErrorAttachment: boolean;
}
```

必须处理：

- 文件选择
- 拖拽上传
- 剪贴板粘贴
- 多文件添加
- 最大数量
- MIME 校验
- 文件大小校验
- 重复文件策略
- Object URL 释放
- 组件卸载清理

### 5.5 输入框 Props

建议 API：

```ts
export interface NovaComposerInputProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  submitting?: boolean;
  placeholder?: string;

  enableUpload?: boolean;
  enableMultiImage?: boolean;
  maxAttachments?: number;
  maxFileSize?: number;
  accept?: string[];

  theme?: 'light' | 'dark';
  compact?: boolean;

  imageSizeSettings: ImageSizeSettings;
  maxImageResolution?: ImageResolutionCap;
  count: number;
  generationModel?: string;
  generationModelOptions?: ComposerModelOption[];
  creditCostPerImage?: number;

  onValueChange?: (value: string) => void;
  onImageSizeSettingsChange: (value: ImageSizeSettings) => void;
  onCountChange: (value: number) => void;
  onGenerationModelChange?: (value: string) => void;
  onSubmit: (
    value: string,
    context: ComposerSubmitContext,
  ) => void | Promise<void>;
}
```

### 5.6 输入交互要求

必须支持：

- `Enter` 发送。
- `Shift + Enter` 换行。
- 中文输入法组合输入期间不得误发送。
- 提交中禁止重复发送。
- 有附件处理中时禁止提交或给出明确提示。
- Prompt 为空且无附件时禁止提交。
- 发送成功后清空 Prompt 与附件。
- 发送失败时保留 Prompt 和附件，方便重试。
- 可配置上传开关。
- 可配置多图开关。
- 支持键盘访问与 aria-label。

### 5.7 Compact 模式

可以复用现有 `useComposerCompact` 的核心判定逻辑，但必须移除对第三方 DOM 的依赖。

`useComposerCompact` 只应依赖：

- NovaCanvas 自己的滚动容器 Ref。
- `.nova-generation-turn` 等稳定内部类名。
- 显式的 `locked` 状态。

Compact 状态的 DOM 必须是同一个 `NovaComposerInput`，不要渲染第二个输入框。

---

## 6. 对话消息类型去 SDK 化

### 6.1 新的内部消息类型

新增：

```ts
// packages/react/src/conversation/types.ts

export interface ConversationViewMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  status: 'success' | 'streaming' | 'error';
}
```

### 6.2 修改对话 Item 联合类型

将：

```ts
{
  type: 'sdk';
  message: Message;
}
```

改为：

```ts
{
  type: 'message';
  message: ConversationViewMessage;
}
```

完整结构建议：

```ts
export type NovaConversationItem =
  | {
      type: 'message';
      message: ConversationViewMessage;
    }
  | {
      type: 'generation-turn';
      id: string;
      prompt: string;
      generationModel?: string;
      ratioLabel?: string;
      resolution?: ResolutionTier;
      slots?: GenerationSlot[];
      isGenerating?: boolean;
      actionType?: 'regenerate' | 'refine' | 'create';
      lastUserPrompt?: string;
      suggestions?: PromptSuggestion[];
    };
```

如果 `generation-batch` 只用于构建过程，不要将其暴露为公开 UI 类型。

### 6.3 命名清理

统一改名：

```txt
AiStudioConversation      → NovaCanvasConversation
SdkMessageBubble          → ConversationMessageBubble
type: 'sdk'               → type: 'message'
mapNovaCanvasToSdkMessages → 删除
```

### 6.4 用户消息渲染策略

当前主链路会在部分生成场景中将用户消息和 Generation Batch 合并为一张生成卡片。重构时必须保持现有历史排序与去重逻辑，不允许出现：

- 同一条用户指令重复显示。
- 同一批图片重复显示。
- Optimistic Batch 与后端历史结果同时显示。
- 已完成任务刷新后消失。

---

## 7. 生成图片选择与继续编辑

### 7.1 单图选择状态

`GenerationSlotGrid` 新增：

```ts
export interface GenerationSlotGridProps {
  slots: GenerationSlot[];
  selectedImageId?: string;
  isGenerating?: boolean;
  generationModel?: string;
  enableDownload?: boolean;
  enableImageEdit?: boolean;

  onSelectImage?: (image: GeneratedImage) => void;
  onContinueEdit?: GenerationImageActionHandler;
  onRegenerate?: GenerationImageActionHandler;
}
```

### 7.2 点击图片行为

当用户点击已完成图片时：

```ts
state.setSelectedImageId(image.id);
```

UI 必须显示明确的选中态：

- 选中边框
- 选中角标或 Check 图标
- Hover 与 Selected 状态区分

### 7.3 单图操作

优先复用现有：

```txt
GenerationSlotActions
GenerationImageActionHandler
```

建议扩展 Action Context：

```ts
export interface GenerationImageActionContext {
  turnPrompt: string;
  resultGroupId?: string;
  imageIndex?: number;
}
```

回调必须带具体图片：

```ts
onContinueEdit(image, context)
onRegenerate(image, context)
```

### 7.4 Footer 行为调整

`GenerationTurnFooter` 保留：

- 再次生成整轮
- Prompt 建议

但“重新编辑”不能在多图情况下只传 Prompt。

建议规则：

- 单图结果：Footer 可继续显示“重新编辑”，自动使用该图。
- 多图结果：Footer 仅在存在 `selectedImageId` 且该图片属于当前轮时显示“编辑所选图片”。
- 每张图片 Hover 操作区始终提供单图“编辑”。

### 7.5 Controller 接口

将当前：

```ts
continueEdit(turnPrompt: string)
```

调整为：

```ts
continueEdit(input: {
  image: GeneratedImage;
  turnPrompt: string;
}): string | null
```

执行时：

1. `setSelectedImageId(image.id)`。
2. 将历史 Prompt 填回输入框。
3. 下一次提交在无新附件时传递 `selectedImageId`。

注意：当前 `submit` 一开始执行 `state.setSelectedImageId(undefined)`，这会提前清空用户选中的结果图。必须修复。

建议改为：

```ts
const selectedImageIdAtSubmit = state.selectedImageId;

// 完成请求参数组装后，再根据业务规则清理。
```

当本轮有新上传附件时：

- 优先使用新上传图片。
- 可以清理旧 `selectedImageId`。

当本轮没有附件且用户通过“继续编辑”进入时：

- 必须保留并发送 `selectedImageId`。

---

## 8. Provider 与状态边界

### 8.1 Provider 责任

`NovaCanvasProvider` 只负责：

- 创建 API Client。
- 创建独立 Zustand Store。
- 提供 QueryClient。
- 在 `bizType` / `sceneType` 改变时重置对应业务状态。

### 8.2 多实例隔离

同一宿主页面可能同时存在两个组件：

```tsx
<NovaCanvasComposer bizType="used_car" />
<NovaCanvasComposer bizType="fashion" />
```

两者必须：

- Store 独立。
- Client 配置独立。
- 会话状态独立。
- 样式不互相影响。

禁止使用模块级单例 Store。

### 8.3 Client 配置更新

当以下 Props 改变时：

```ts
apiBaseUrl
authToken
```

Provider 内的 Client 必须真正更新到 Context 消费者。

不要只修改 `clientRef.current`，但 Context value 仍然保持旧对象引用。

建议使用：

```ts
const client = useMemo(
  () => createNovaCanvasClient({ baseUrl, authToken }),
  [baseUrl, authToken],
);
```

并将 `client` 放入稳定的 Context value。

### 8.4 宿主业务状态

NovaCanvas 不应直接管理二手车或服装项目的：

- 用户登录信息
- 积分余额
- 车源 ID
- 商品 ID
- 订单 ID

统一由 Props 输入：

```ts
userId
metadata
authToken
```

结果通过回调输出：

```ts
onGenerated
onTaskChange
onError
```

---

## 9. 公共组件 API 设计

建议保留并完善：

```ts
export interface NovaCanvasComposerProps {
  userId?: string;
  bizType: BizType;
  sceneType?: string;
  mode?: CanvasMode;

  defaultPrompt?: string;
  defaultImages?: string[];

  enableUpload?: boolean;
  enableMultiImage?: boolean;
  enableConversation?: boolean;
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  enableModelSelector?: boolean;

  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;

  apiBaseUrl?: string;
  authToken?: string;
  metadata?: Record<string, unknown>;

  maxImageResolution?: ImageResolutionCap;
  availableGenerationModels?: Array<{
    label: string;
    value: string;
  }>;

  portalContainer?: HTMLElement | (() => HTMLElement | null);

  onGenerated?: (images: GeneratedImage[]) => void;
  onTaskChange?: (tasks: GenerationTask[]) => void;
  onConversationChange?: (conversationId: string) => void;
  onSelectedImageChange?: (image?: GeneratedImage) => void;
  onError?: (error: Error) => void;
}
```

### 9.1 默认值规则

- `enableUpload = true`
- `enableMultiImage = true`
- `enableConversation = true`
- `enableImageEdit = true`
- `enableDownload = true`
- `enableModelSelector = true`
- `theme = 'light'`

### 9.2 外部可扩展性

本轮不需要做复杂 Slot API，但应预留：

```ts
renderHeader?
renderEmpty?
renderTaskPanel?
renderComposerToolbarExtra?
```

没有实际使用场景的扩展点本轮可以不实现，禁止为了“看起来灵活”引入过度抽象。

---

## 10. 样式封装规范

### 10.1 根作用域

组件根元素必须使用稳定作用域：

```tsx
<div
  className="novacanvas-root"
  data-theme={theme}
  data-biz-type={bizType}
>
```

所有组件样式必须位于：

```scss
.novacanvas-root { ... }
```

或稳定的 `nova-*` BEM 类名下。

### 10.2 禁止依赖第三方 DOM

移除以下类型选择器：

```scss
> [data-theme] > .mt-auto
.mt-4.grid
.relative.z-0
.flex.w-full
button[aria-label='Send']
```

改为 NovaCanvas 自己控制的类名：

```scss
.nova-composer-input
.nova-composer-input__attachments
.nova-composer-input__textarea
.nova-composer-input__footer
.nova-composer-input__toolbar
.nova-composer-input__send
.nova-composer-input__credits
```

### 10.3 禁止绝对注入第三方输入框

移除：

```txt
nova-composer__composer-toolbar-inject
nova-composer__composer-credits-inject
```

模型、尺寸、数量、积分必须直接渲染在本地输入框 Footer 中。

### 10.4 Tailwind 处理

`@novacanvas/react` 的正式产物不能依赖宿主项目 Tailwind 扫描源代码。

要求：

- 组件包内部使用 SCSS / CSS Modules / 已编译 CSS。
- 最终输出独立 `dist/styles.css`。
- 宿主项目无需在 `tailwind.config` 中扫描 `node_modules/@novacanvas/react`。

### 10.5 CSS 变量

主题颜色通过变量管理，例如：

```scss
.novacanvas-root {
  --nova-bg: #f7f7f8;
  --nova-surface: #ffffff;
  --nova-text: #18181b;
  --nova-muted: #71717a;
  --nova-line: #e4e4e7;
  --nova-accent: #111827;
}

.novacanvas-root[data-theme='dark'] {
  --nova-bg: #111214;
  --nova-surface: #191a1d;
  --nova-text: #f4f4f5;
  --nova-muted: #a1a1aa;
  --nova-line: #2c2e33;
  --nova-accent: #f4f4f5;
}
```

### 10.6 Portal 与弹层

当前部分 Popover 使用：

```ts
getPopupContainer={() => document.body}
```

这会带来：

- 样式作用域脱离根节点。
- 多实例主题混乱。
- SSR 中 `document` 不存在。

必须增加统一 `portalContainer` 配置。

规则：

1. 优先使用传入的 `portalContainer`。
2. 默认使用当前 NovaCanvas 根节点。
3. 只有找不到根节点时才回退到 `document.body`。
4. 访问 `document` 前必须判断浏览器环境。

### 10.7 H5 与安全区域

必须验证：

- 375px 宽度。
- 390px 宽度。
- 768px 宽度。
- 输入框不会覆盖最后一条消息。
- 底部支持 `env(safe-area-inset-bottom)`。
- Popover 不溢出视口。
- 多图附件可横向滚动或自动换行。

---

## 11. 组件包构建方案

### 11.1 推荐工具

使用 **Vite Library Mode + vite-plugin-dts**。

原因：

- 当前项目已经使用 Vite。
- 可编译 TSX。
- 可处理 SCSS 并输出 CSS。
- 可生成 ESM 产物。
- 通过 `vite-plugin-dts` 生成声明文件。

### 11.2 构建产物

必须生成：

```txt
packages/react/dist/
├── index.js
├── index.d.ts
└── styles.css
```

如 Vite 生成拆分文件，可以保留 chunks，但 exports 必须稳定。

### 11.3 package.json 目标结构

```json
{
  "name": "@novacanvas/react",
  "version": "0.2.0",
  "private": false,
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "README.md"
  ],
  "sideEffects": [
    "**/*.css"
  ],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./styles.css": "./dist/styles.css"
  },
  "scripts": {
    "clean": "rimraf dist",
    "build": "vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "@arco-design/web-react": ">=2.60"
  }
}
```

版本号可根据项目规范调整。

### 11.4 依赖处理

必须外部化：

```txt
react
react-dom
@arco-design/web-react
```

禁止把 React 打入组件包，否则宿主项目可能出现：

- Invalid hook call
- Context 不一致
- React 重复实例

建议继续作为内部依赖：

```txt
@novacanvas/sdk
@novacanvas/types
@novacanvas/biz-config
@tanstack/react-query
zustand
lucide-react
```

是否外部化 `@tanstack/react-query`、`zustand` 可由 Codex 根据 Bundle 与 Monorepo规范决定，但必须通过外部消费测试。

### 11.5 Arco 样式策略

本轮推荐：

- 不在 `@novacanvas/react/styles.css` 中重复打包完整 Arco CSS。
- README 明确要求宿主引入：

```ts
import '@arco-design/web-react/dist/css/arco.css';
import '@novacanvas/react/styles.css';
```

未来如需要完全零配置安装，可再提供包含 Arco CSS 的独立入口，不在本轮实现。

---

## 12. 公开导出规范

`packages/react/src/index.ts` 只导出稳定公共 API。

建议导出：

```ts
export {
  NovaCanvasComposer,
  ImageComposerPage,
  ImageComposerWorkspace,
} from './image-composer-page';

export {
  NovaCanvasProvider,
  useNovaCanvas,
  useNovaCanvasClient,
} from './provider';

export {
  NovaComposerInput,
} from './composer/nova-composer-input';

export type {
  NovaCanvasComposerProps,
  ImageComposerPageProps,
  ImageComposerWorkspaceProps,
  NovaComposerInputProps,
  ComposerAttachment,
  ComposerSubmitContext,
} from './...';

export { createNovaCanvasClient } from '@novacanvas/sdk';
export type * from '@novacanvas/types';
```

不建议长期公开：

- 内部 Batch 构建函数。
- 内部 Session Storage Key。
- 样式实现细节。
- 未稳定的内部 Store mutation。

本轮例外：旧 `ComposerInput` 需要作为兼容导出保留一个迁移周期，并标记 `@deprecated`。它只能代理 `NovaComposerInput`，不得形成第二套实现。

当前 `generate-core` 大量内部类型已经从入口导出。Codex 需要逐一判断：

- 外部项目真实需要的保留。
- 仅 NovaCanvas 内部使用的停止公开。

本轮不要无理由破坏现有调用；可先保留兼容导出并加 `@deprecated`，下一版本再删除。

---

## 13. 文件级改造清单

### 13.1 新增文件

```txt
packages/react/src/composer/types.ts
packages/react/src/composer/use-composer-attachments.ts
packages/react/src/composer/attachment-validation.ts
packages/react/src/composer/composer-attachment-list.tsx
packages/react/src/composer/composer-file-picker.tsx
packages/react/src/composer/composer-textarea.tsx
packages/react/src/composer/composer-toolbar.tsx
packages/react/src/composer/composer-send-button.tsx
packages/react/src/composer/nova-composer-input.tsx
packages/react/src/conversation/types.ts
packages/react/src/conversation/conversation-message-bubble.tsx
packages/react/src/conversation/nova-canvas-conversation.tsx
packages/react/vite.config.ts
packages/react/README.md
```

样式可以先继续放在单文件，验证稳定后再拆分；最终推荐拆分到 `src/styles/`。

### 13.2 修改文件

#### `ai-studio-conversation.tsx`

- 先改为本地组件实现。
- 迁移完成后重命名为 `nova-canvas-conversation.tsx`。
- 删除所有 SDK import。
- 删除 SDK CSS import。

#### `image-composer-page.tsx`

- 改用本地 `ComposerAttachment`。
- 改用 `NovaCanvasConversation`。
- 增加图片选择回调。
- 将 `selectedImageId` 传给生成结果区。
- 支持 `className`、`style`、`portalContainer`。

#### `generate-core/use-generate-controller.ts`

- 改用本地附件类型。
- 修复提交前过早清空 `selectedImageId`。
- `continueEdit` 改为接收具体图片。
- 保持发送时上传附件。

#### `build-conversation-items.ts`

- 移除 SDK `Message`。
- `type: 'sdk'` 改为 `type: 'message'`。
- 使用 `ConversationViewMessage`。
- 保持历史去重和 Batch 合并行为。

#### `nova-conversation-view.tsx`

- 移除 SDK `Message`。
- `SdkMessageBubble` 改名。
- 向 `GenerationSlotGrid` 传递选中状态与单图操作。

#### `generation-slot-grid.tsx`

- 增加选中状态。
- 增加单图编辑和重新生成操作。
- 复用 `GenerationSlotActions`。
- 保持 Loading、失败、预览下载。

#### `generation-turn-footer.tsx`

- 多图时避免无目标的“重新编辑”。
- 保留整轮再次生成。
- 可根据当前选中图片显示“编辑所选图片”。

#### `provider.tsx`

- 修复 Client 配置更新。
- 确保多实例隔离。
- Context value 使用稳定 memo。

#### `styles.scss`

- 删除所有 SDK DOM 选择器。
- 删除绝对注入样式。
- 改为本地 BEM 结构。
- 所有样式收敛到 `.novacanvas-root`。

#### `index.ts` / `composer.tsx`

- 更新公共导出。
- 正式导出 `NovaComposerInput`。
- 本轮继续导出旧 `ComposerInput`，但添加 `@deprecated` 注释，并让它只作为 `NovaComposerInput` 的兼容包装器。
- `MessageList` 如确认不在真实主链路使用，可停止导出；删除前必须完成全局检索与测试。

#### `package.json`

- 删除 `@company/ai-studio-sdk`。
- 增加正式构建配置。
- 设置正确 exports、files、peerDependencies。

#### `tsconfig.json`

- 用于类型检查与声明生成。
- 不再将源码直接作为 package exports。

### 13.3 待删除或迁移文件

删除前必须全局检索确认无引用：

```txt
packages/react/src/map-sdk-messages.ts
packages/react/src/message-list.tsx
```

`packages/react/src/composer-input.tsx` 本轮不得直接删除。处理方式为：

1. 保留文件路径，避免旧调用点立即失效；
2. 改造成 `NovaComposerInput` 的兼容包装器；
3. 保留旧 Props 类型并完成字段映射；
4. 添加 `@deprecated` 注释和迁移说明；
5. 在后续独立主版本中确认所有消费者完成迁移后再删除。

如果 `GeneratedImageResult` 与新 GenerationSlotGrid 职责完全重复，也应删除或停止导出。

### 13.4 删除 workspace SDK

执行：

```bash
rg "@company/ai-studio-sdk" .
```

当结果为 0 后：

- 删除 `packages/company-ai-studio-sdk`。
- 删除 `.tmp/ai-studio-sdk` 等临时目录。
- 删除与该 SDK 相关的 tgz 产物（确认无其他用途后）。
- 更新 `pnpm-lock.yaml`。

如果仓库中其他正式项目仍使用此 SDK，只移除 NovaCanvas 强依赖，不可贸然删除包目录；Codex 必须先输出引用清单。

---

## 13.5 原输入框能力迁移实施细则

### 13.5.1 先做行为盘点

Codex 必须先审计以下文件及相关样式，输出“原能力 → 新组件位置”的映射表：

```txt
packages/react/src/composer-input.tsx
packages/react/src/ai-studio-conversation.tsx
packages/react/src/styles.scss
packages/react/src/generate-core/use-generate-controller.ts
```

不得只根据组件名称判断是否废弃，必须确认其真实调用链、事件与样式。

### 13.5.2 状态模型

新组件建议使用明确状态：

```ts
export type ComposerDisplayState =
  | 'collapsed'
  | 'focused'
  | 'expanded'
  | 'generating';
```

展开条件至少满足：

```ts
const expanded =
  focused ||
  value.trim().length > 0 ||
  attachments.length > 0 ||
  generating;
```

禁止为了动画在收起/展开时渲染两个不同输入框实例；必须保持同一个输入框 DOM 和同一份附件状态。

### 13.5.3 附件堆叠组件

如果当前已有图片堆叠和 Hover 展开效果，应迁移为独立子组件：

```txt
packages/react/src/composer/attachment-stack/
├── attachment-stack.tsx
├── attachment-card.tsx
├── use-attachment-stack.ts
└── attachment-stack.scss
```

该组件只负责本地附件展示与交互，不直接调用业务上传接口。

### 13.5.4 上传时机

保持当前主链路：

```txt
选择图片
→ 生成浏览器本地预览
→ 用户点击发送
→ Controller 上传图片
→ 获得 imageId
→ 创建图片生成任务
```

不得因为复用旧 `ComposerInput` 而恢复为“选择文件后立即上传”的旧逻辑。兼容层必须适配为发送时上传。

### 13.5.5 样式迁移

- 保留视觉尺寸、间距、圆角、动画时长和已有主题表现。
- 将依赖 SDK DOM 的选择器替换为 NovaCanvas 自有 BEM 类名。
- 动画应优先使用 `height/max-height/transform/opacity` 的稳定组合，并尊重 `prefers-reduced-motion`。
- 禁止复制旧样式与新样式两套长期并存。

### 13.5.6 兼容测试

至少增加两组测试：

1. `NovaComposerInput` 新 API 测试；
2. `ComposerInput` 旧 Props 兼容测试。

两者应最终驱动同一内部实现，视觉与提交结果保持一致。

---

## 14. 实施阶段与提交拆分

### 阶段 1：建立本地输入能力

建议提交：

```txt
refactor/react-local-composer
```

任务：

- 新增附件类型。
- 新增附件 Hook。
- 新增 `NovaComposerInput`。
- 保持原 `onSend(value, context)` 行为。
- 暂不删除 SDK。

### 阶段 2：切换主链路

建议提交：

```txt
refactor/switch-to-nova-composer
```

任务：

- 主页面切换到本地输入框。
- `AiStudioConversation` 替换完成。
- Controller 改用本地附件类型。
- 保证生成流程不变。

### 阶段 3：消息类型去 SDK 化

建议提交：

```txt
refactor/remove-ai-studio-message-types
```

任务：

- 新建内部消息类型。
- 修改 conversation item。
- 删除 SDK Message 引用。
- 清理 Adapter。

### 阶段 4：结果图选择与编辑

建议提交：

```txt
feat/generated-image-selection
```

任务：

- 图片选中状态。
- 单图编辑。
- 单图重新生成。
- `selectedImageId` 全链路。

### 阶段 5：样式重写

建议提交：

```txt
refactor/rewrite-composer-styles
```

任务：

- 移除第三方 DOM 选择器。
- 重写输入区样式。
- 日间、夜间、H5。
- Portal 作用域。

### 阶段 6：移除 SDK

建议提交：

```txt
refactor/remove-company-ai-studio-sdk
```

任务：

- 删除 dependency。
- 全局引用归零。
- 删除无用包和临时产物。
- 更新 lockfile。

### 阶段 7：正式组件包构建

建议提交：

```txt
build/react-library-dist
```

任务：

- Vite Library Mode。
- d.ts。
- CSS 产物。
- package exports。
- 外部消费测试。

---

## 15. 测试要求

### 15.1 单元测试

使用 Vitest。

必须覆盖：

- 附件类型校验。
- 超大文件拒绝。
- 多图数量限制。
- Object URL 清理。
- `buildConversationItems` 历史去重。
- Optimistic Batch 与后端结果合并。
- `selectedImageId` 提交逻辑。
- 发送失败保留输入。

### 15.2 组件测试

使用 React Testing Library。

必须覆盖：

1. 输入文字并 Enter 发送。
2. Shift + Enter 换行。
3. 中文输入法 composing 时不发送。
4. 选择、预览、删除图片。
5. 发送时附件进入 Submit Context。
6. 提交中按钮禁用。
7. 切换模型、比例、数量。
8. 点击结果图后出现选中状态。
9. 点击单图编辑传递正确 imageId。
10. 多图时 Footer 不执行模糊编辑。

### 15.3 E2E 测试

使用 Playwright，至少覆盖 Mock Runtime：

- 文生图。
- 上传图片后生成。
- 多图生成。
- 选择第二张继续编辑。
- 刷新后恢复会话。
- 日间 / 夜间切换。
- H5 页面输入与滚动。

### 15.4 外部消费测试

必须建立一个不依赖当前 Monorepo源码解析规则的测试项目，例如：

```txt
examples/react-vite-consumer
```

测试方式：

```bash
pnpm --filter @novacanvas/react build
pnpm --filter @novacanvas/react pack
```

在干净 React + Vite 项目中安装生成的 tgz，并验证：

```ts
import '@arco-design/web-react/dist/css/arco.css';
import { NovaCanvasComposer } from '@novacanvas/react';
import '@novacanvas/react/styles.css';
```

必须确认没有：

- 无法解析 TypeScript 源文件。
- 无法解析 SCSS。
- SDK 缺失。
- React 重复实例。
- 类型声明缺失。
- 样式污染。
- Popup 主题错误。

---

## 16. 验收标准

### 16.1 依赖验收

```bash
rg "@company/ai-studio-sdk" .
```

结果必须为 0，或 Codex 明确说明仓库其他非 NovaCanvas 模块仍需要保留的原因。

### 16.2 构建验收

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

全部通过。

组件包必须存在：

```txt
packages/react/dist/index.js
packages/react/dist/index.d.ts
packages/react/dist/styles.css
```

### 16.3 功能验收

- 页面只存在一个输入框实例。
- 原输入框的收起/展开动画、附件堆叠、Hover、粘贴、删除、比例/数量控制等现有能力没有回归。
- 旧 `ComposerInput` Props 调用仍可正常编译与运行，并在控制台或类型声明中提示 deprecated。
- 新旧入口提交后产生相同的 Prompt 与附件集合。
- 文本发送正常。
- 图片选择、预览、删除正常。
- 附件在发送时上传。
- 生成任务与 WebSocket / Polling 行为不回归。
- 多图结果可以点击选择。
- 选择第二张后，“继续编辑”传递第二张 imageId。
- 发送新的编辑指令时不会提前丢失 `selectedImageId`。
- 单图和多图结果均能下载。
- 任务失败状态仍正常显示。
- 历史消息不会重复。

### 16.4 复用验收

在外部项目中分别验证：

```tsx
<NovaCanvasComposer bizType="used_car" />
<NovaCanvasComposer bizType="fashion" />
```

后端无需改变接口。

### 16.5 样式验收

- 日间模式正常。
- 夜间模式正常，背景偏中性深灰，不依赖蓝色色调。
- 375px H5 正常。
- 输入框不遮挡最后一张图片。
- 弹层不超出视口。
- 宿主项目按钮、输入框、图片样式不被全局覆盖。
- 同页两个 NovaCanvas 实例样式相互隔离。

---

## 17. Codex 执行约束

Codex 必须遵守：

1. 先全局检索引用，再删除文件。
2. 采用渐进迁移，不允许第一步直接删除 SDK 导致项目无法运行。
3. 每个阶段完成后执行 typecheck 和相关测试。
4. 不修改后端模型 Provider。
5. 不修改 DeepSeek Prompt。
6. 不改变现有 API 路径和 WebSocket 事件格式。
7. 不重做整体视觉设计；必须保留原输入框已经完成的视觉、动画和交互，仅将 DOM 与样式所有权迁入 NovaCanvas。
8. 不将二手车、服装业务字段写死到通用组件。
9. 不把 React 打进组件产物。
10. 不让宿主项目负责转译 NovaCanvas 的 TSX 或 SCSS 源码。
11. 本轮不得删除 `composer-input.tsx`；必须改为兼容包装器。
12. 不允许同时维护两套真实输入框状态，`NovaComposerInput` 必须是唯一真实实现。

---

## 18. Codex 开始执行前必须输出

在修改代码前，先输出：

1. `@company/ai-studio-sdk` 全部引用文件。
2. 当前主链路实际使用的输入框和消息组件。
3. 计划新增、修改、删除的文件清单。
4. 是否有仓库其他模块仍使用 `company-ai-studio-sdk`。
5. 原输入框已有功能清单及迁移映射表。
6. 旧 `ComposerInput` Props 到 `NovaComposerInputProps` 的映射方案。
7. 预计的提交阶段。

得到清单后再开始代码修改。

---

## 19. Codex 完成后必须输出

1. 实际修改文件列表。
2. 实际删除文件列表。
3. 最终组件目录树。
4. `NovaCanvasComposerProps` 最终定义。
5. `ComposerAttachment` 最终定义。
6. `selectedImageId` 流转说明。
7. 组件包构建产物说明。
8. 外部 React 项目接入示例。
9. 所有执行命令及结果。
10. 原输入框能力迁移核对结果。
11. 旧 `ComposerInput` 兼容测试结果。
12. 未解决问题与后续建议。

---

## 20. 可直接交给 Codex 的执行指令

```txt
请基于 main 分支严格执行《NovaCanvas_React_Component_Encapsulation_Spec_v2.md》中的组件封装方案。

本轮目标是：
1. 移除 @company/ai-studio-sdk 强依赖；
2. 使用 NovaCanvas 自己的 NovaComposerInput、附件类型和消息类型，同时完整迁移并保留原输入框已有视觉、动画与交互；
3. 收敛重复输入区和消息展示实现；
4. 打通生成图 selectedImageId 与单图继续编辑；
5. 将 @novacanvas/react 构建为具有 dist/index.js、dist/index.d.ts、dist/styles.css 的正式组件包；
6. 在干净 React + Vite 项目中验证安装和使用；
7. 将原 composer-input.tsx 改为兼容包装器并保留旧 Props，本轮不得直接删除。

严格限制：
- 不修改 Seedream、GPT Image 2、DeepSeek 和 NestJS 后端生成逻辑；
- 不重做整个 UI；
- 不改变现有 API 与 WebSocket 协议；
- 不把二手车或服装业务写死进组件；
- 不允许直接删除 SDK 后再修复大量编译错误，必须渐进替换；
- 不允许以重构为理由丢失原输入框动画、图片堆叠、Hover、粘贴、删除、比例/数量控制等能力；
- 不允许保留两套真实输入框实现；
- 每个阶段都需要执行 typecheck、build 和对应测试。

开始修改前，先输出：
- SDK 全部引用清单；
- 当前真实主链路；
- 新增、修改、删除文件计划；
- 是否有其他模块仍依赖该 SDK；
- 原输入框功能盘点和迁移映射；
- 旧 Props 的兼容映射。

完成后输出：
- 修改文件清单；
- 构建结果；
- 测试结果；
- 外部项目接入示例；
- selectedImageId 流转说明；
- 原输入框能力迁移核对与兼容测试结果；
- 未解决问题。
```

---

## 21. 完成定义

只有同时满足以下条件，本轮才算完成：

1. NovaCanvas 的输入区和消息区不再依赖 `@company/ai-studio-sdk`。
2. 原输入框已经完成的视觉、动画、附件和工具栏能力均已迁入 `NovaComposerInput`，且旧 `ComposerInput` 仍通过兼容包装器可用。
3. `@novacanvas/react` 具有正式可安装的构建产物。
4. 外部项目不需要转译 NovaCanvas 源码。
5. 多图结果能够选择具体图片继续编辑。
6. 二手车与服装业务能够使用同一组件包。
7. Typecheck、Build、组件测试和外部消费测试全部通过。

本轮完成后，再单独进入后端图片生成链路修复阶段。
