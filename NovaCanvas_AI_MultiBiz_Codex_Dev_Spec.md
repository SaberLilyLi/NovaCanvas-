# NovaCanvas AI（多业务通用版）开发文档

> 面向 **Codex** 的可执行开发文档  
> 建议执行工具：**Codex**（用于架构搭建、前后端骨架、模块拆分、类型设计、接口实现）  
> 后续 UI 微调建议工具：**Cursor**  
>
> 本文档目标：开发一套 **可独立运行、可嵌入其他项目、支持多业务场景复用** 的图片生成平台。  
> 当前重点支持业务：
> 1. 二手车创意生图
> 2. 服装灵感生图
>
> 后续可扩展业务：电商商品图、营销海报、家居灵感图、通用图片生成。

---

# 1. 项目命名

## 项目名

**NovaCanvas AI**

## 项目定位

NovaCanvas AI 不是单一“二手车创意生图页面”，而是：

**一个通用图片生成平台 + 可嵌入业务系统的前端组件 + 可复用的 AI 生图后端服务**。

## 项目目标

实现一套企业级、可扩展、可复用的图片生成系统，支持：

- 文生图
- 图生图
- 文 + 图生图
- 多图上传
- 多图参考生成
- 多轮图片生成
- 多轮图片对话
- 多图生成
- 多指令拆分
- 串行 / 并行生成
- 图片下载
- 继续编辑
- 重新生成
- 失败重试
- 接入不同业务场景（如二手车、服装）

---

# 2. 核心设计原则

1. **底层通用化**：图片生成、任务调度、会话上下文、状态推送统一实现。
2. **业务配置化**：二手车、服装等行业差异通过配置与 Prompt 模板实现。
3. **前端可嵌入**：既能独立运行，也能作为 React 组件接入其他项目。
4. **后端服务化**：独立部署，统一对外提供生图服务。
5. **类型统一**：前后端使用 TypeScript，复用类型定义。
6. **模型可替换**：当前使用 DeepSeek + GPT Image 2，后续可扩展其他模型。

---

# 3. 技术栈

## 3.1 前端

- React
- TypeScript
- Arco Design
- TailwindCSS
- SCSS
- Zustand
- TanStack Query
- Vite
- WebSocket

## 3.2 后端

- Node.js
- TypeScript
- NestJS
- Prisma
- PostgreSQL（或 MySQL）
- Redis
- BullMQ
- Socket.IO 或 Nest WebSocket
- MinIO / OSS / S3

## 3.3 AI 模型

- 语言大模型：**DeepSeek**
- 图片模型：**GPT Image 2**

## 3.4 模型职责分工

### DeepSeek 负责

- 理解用户意图
- 判断任务类型（文生图 / 图生图 / 文+图生图 / 图片问答）
- 拆分多指令
- 判断生成张数
- 判断并行 / 串行模式
- 生成结构化 Prompt
- 将业务信息与用户输入拼装为最终图片任务

### GPT Image 2 负责

- 文生图
- 图生图
- 文 + 图生图
- 多轮图片编辑
- 基于参考图片生成结果图

---

# 4. 目标产物

本项目最终要产出三层能力：

## 4.1 独立 Web 应用

用于独立运行和演示。

目录：

- `apps/web`

## 4.2 React 可复用组件

用于嵌入其他 React 项目，例如二手车项目或服装项目。

目录：

- `packages/react`

## 4.3 AI 生图后端服务

统一承载任务创建、状态管理、模型调用、图片存储等能力。

目录：

- `apps/server`

---

# 5. Monorepo 目录结构

```txt
NovaCanvas-AI/
├── apps/
│   ├── web/                         # 独立 Web 应用（React）
│   └── server/                      # NestJS 后端服务
├── packages/
│   ├── react/                       # React 可复用组件库
│   ├── sdk/                         # 前端请求 SDK
│   ├── types/                       # 前后端共享类型
│   ├── biz-config/                  # 业务配置中心
│   └── prompt-presets/              # Prompt 模板中心
├── docs/
│   ├── api.md
│   ├── websocket.md
│   ├── architecture.md
│   └── prompt-strategy.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json                       # 可选，支持 monorepo 任务编排
└── README.md
```

建议使用：

- `pnpm workspace`
- 可选 `turbo`

---

# 6. 多业务通用架构

```txt
业务项目（如二手车 / 服装）
        ↓
NovaCanvas React 组件 / SDK
        ↓
NovaCanvas Server（NestJS）
        ↓
DeepSeek（任务规划）
        ↓
BullMQ 队列
        ↓
GPT Image 2（图片生成 / 编辑）
        ↓
对象存储（MinIO / OSS / S3）
        ↓
WebSocket 状态推送
        ↓
前端页面实时展示结果
```

---

# 7. 业务配置设计

业务差异不能写死在代码里，必须通过配置实现。

## 7.1 BizType 枚举

```ts
export type BizType =
  | 'general'
  | 'used_car'
  | 'fashion'
  | 'ecommerce'
  | 'poster';
```

## 7.2 SceneType（字符串配置）

采用字符串或枚举，按业务灵活扩展。

例如：

- 二手车：`creative_poster`、`rainy_highway`、`garage`、`clean_interior`
- 服装：`inspiration`、`lookbook`、`style_transfer`、`model_scene`

## 7.3 业务配置目录

```txt
packages/biz-config/
├── src/
│   ├── general.ts
│   ├── used-car.ts
│   ├── fashion.ts
│   ├── ecommerce.ts
│   └── index.ts
```

## 7.4 业务配置示例

### used-car.ts

```ts
export const usedCarConfig = {
  bizType: 'used_car',
  title: '创意生图',
  description: '适用于二手车营销图、场景图、内饰优化图生成',
  enableConversation: true,
  enableMultiImage: true,
  enableImageEdit: true,
  defaultRatioOptions: ['1:1', '4:3', '16:9', '9:16'],
  supportedSceneTypes: [
    'creative_poster',
    'rainy_highway',
    'garage',
    'clean_interior',
    'showroom'
  ]
};
```

### fashion.ts

```ts
export const fashionConfig = {
  bizType: 'fashion',
  title: '灵感生图',
  description: '适用于服装风格灵感、穿搭氛围图、Lookbook 图生成',
  enableConversation: true,
  enableMultiImage: true,
  enableImageEdit: true,
  defaultRatioOptions: ['1:1', '3:4', '4:5', '9:16'],
  supportedSceneTypes: [
    'inspiration',
    'lookbook',
    'style_transfer',
    'model_scene',
    'fabric_mood'
  ]
};
```

---

# 8. Prompt 模板中心设计

Prompt 模板必须独立管理，不能散落在业务逻辑里。

## 8.1 目录结构

```txt
packages/prompt-presets/
├── src/
│   ├── general.ts
│   ├── used-car.ts
│   ├── fashion.ts
│   ├── builders/
│   │   ├── merge-user-prompt.ts
│   │   ├── build-scene-prompt.ts
│   │   └── build-style-prompt.ts
│   └── index.ts
```

## 8.2 模板职责

Prompt 模板需根据：

- `bizType`
- `sceneType`
- 用户文本输入
- 上传图片信息
- 多轮对话上下文
- 最近生成图片

拼出最终的图片生成 Prompt。

## 8.3 二手车模板示例

目标：强化真实感、营销图、车身质感、背景场景。

## 8.4 服装模板示例

目标：强化风格、穿搭、材质、氛围感、灵感表达。

---

# 9. 前端组件设计

核心前端必须做成通用组件，而不是某个业务专用页面。

## 9.1 React 组件库导出

至少导出：

- `NovaCanvasComposer`
- `NovaCanvasProvider`
- `useNovaCanvas`
- `createNovaCanvasClient`

## 9.2 核心组件 Props 设计

```ts
export interface NovaCanvasComposerProps {
  userId?: string;
  bizType: 'general' | 'used_car' | 'fashion' | 'ecommerce' | 'poster';
  sceneType?: string;
  mode?: 'text-to-image' | 'image-to-image' | 'chat-image' | 'full';
  defaultPrompt?: string;
  defaultImages?: string[];
  enableUpload?: boolean;
  enableMultiImage?: boolean;
  enableConversation?: boolean;
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  theme?: 'light' | 'dark';
  apiBaseUrl?: string;
  authToken?: string;
  metadata?: Record<string, any>;
  onGenerated?: (images: GeneratedImage[]) => void;
  onTaskChange?: (tasks: GenerationTask[]) => void;
  onError?: (error: Error) => void;
}
```

## 9.3 组件使用示例

### 二手车项目接入

```tsx
<NovaCanvasComposer
  bizType="used_car"
  sceneType="creative_poster"
  defaultImages={carImages}
  enableMultiImage
  enableImageEdit
  enableConversation
  onGenerated={handleGenerated}
/>
```

### 服装项目接入

```tsx
<NovaCanvasComposer
  bizType="fashion"
  sceneType="inspiration"
  defaultImages={fashionImages}
  enableMultiImage
  enableImageEdit
  enableConversation
  onGenerated={handleGenerated}
/>
```

---

# 10. 前端页面结构

独立 Web 应用建议结构：

```txt
apps/web/src/
├── pages/
│   ├── playground/                 # 通用演示页
│   ├── used-car-demo/              # 二手车示例页
│   └── fashion-demo/               # 服装示例页
├── components/
├── hooks/
├── stores/
├── services/
├── utils/
└── styles/
```

## 页面功能要求

- 输入提示词
- 上传单图/多图
- 选择比例
- 选择生成数量
- 查看消息对话
- 查看任务状态
- 查看生成结果
- 下载图片
- 继续编辑
- 重新生成
- 切换业务示例（通用 / 二手车 / 服装）

---

# 11. 前端状态设计

使用 Zustand。

## 11.1 共享类型

```ts
export interface UploadedImage {
  id: string;
  url: string;
  type: 'uploaded' | 'generated';
  name?: string;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageIds?: string[];
  taskIds?: string[];
  createdAt: string;
}

export interface GenerationTask {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  progress: number;
  taskType: 'text_to_image' | 'image_to_image' | 'text_image_to_image';
  prompt: string;
  resultImageId?: string;
  errorMessage?: string;
}

export interface ConversationState {
  conversationId: string;
  bizType: string;
  sceneType?: string;
  messages: ConversationMessage[];
  images: UploadedImage[];
  tasks: GenerationTask[];
  latestImageId?: string;
}
```

## 11.2 关键逻辑

必须维护：

- `latestImageId`
- `messages[]`
- `images[]`
- `tasks[]`
- `conversationId`

规则：

- 用户说“把它改成红色”“继续调整”“这张图更亮一点”时
- 如果本轮没有新上传图片
- 默认使用 `latestImageId`

---

# 12. 后端服务架构

推荐使用 NestJS 模块化设计。

## 12.1 后端目录结构

```txt
apps/server/src/
├── main.ts
├── app.module.ts
├── common/
│   ├── dto/
│   ├── enums/
│   ├── filters/
│   ├── interceptors/
│   ├── guards/
│   ├── pipes/
│   └── utils/
├── config/
│   ├── env.config.ts
│   └── app.config.ts
├── modules/
│   ├── auth/
│   ├── upload/
│   ├── conversation/
│   ├── generation/
│   ├── websocket/
│   ├── storage/
│   ├── deepseek/
│   ├── image/
│   ├── biz/
│   └── prompt/
├── queues/
│   ├── image.queue.ts
│   ├── image.processor.ts
│   └── queue.module.ts
└── prisma/
    └── prisma.service.ts
```

---

# 13. 数据库设计

使用 Prisma。

## 13.1 users

- id
- name
- createdAt
- updatedAt

## 13.2 conversations

- id
- userId
- bizType
- sceneType
- title
- latestImageId
- createdAt
- updatedAt

## 13.3 messages

- id
- conversationId
- role
- content
- imageIds（JSON）
- taskIds（JSON）
- createdAt

## 13.4 images

- id
- userId
- conversationId
- url
- storageKey
- type（uploaded / generated）
- sourceImageIds（JSON）
- prompt
- bizType
- sceneType
- width
- height
- createdAt

## 13.5 generation_tasks

- id
- userId
- conversationId
- bizType
- sceneType
- status
- taskType
- prompt
- inputImageIds（JSON）
- resultImageId
- progress
- errorMessage
- createdAt
- updatedAt

---

# 14. API 设计

后端接口必须业务无关，统一使用 `bizType` 和 `sceneType`。

## 14.1 上传图片

### POST `/api/upload/image`

请求：

- multipart/form-data

返回：

```json
{
  "imageId": "img_001",
  "url": "https://example.com/1.png"
}
```

## 14.2 创建生成任务

### POST `/api/generation/create`

请求：

```json
{
  "conversationId": "conv_001",
  "bizType": "fashion",
  "sceneType": "inspiration",
  "prompt": "参考这张服装图生成一组法式轻奢穿搭灵感图",
  "imageIds": ["img_001"],
  "count": 2,
  "size": "1024x1024",
  "metadata": {
    "season": "summer",
    "style": "french"
  }
}
```

返回：

```json
{
  "conversationId": "conv_001",
  "tasks": [
    {
      "taskId": "task_001",
      "status": "pending"
    },
    {
      "taskId": "task_002",
      "status": "pending"
    }
  ]
}
```

## 14.3 获取会话详情

### GET `/api/conversation/:conversationId`

## 14.4 获取任务详情

### GET `/api/generation/task/:taskId`

## 14.5 重试任务

### POST `/api/generation/task/:taskId/retry`

## 14.6 取消任务

### POST `/api/generation/task/:taskId/cancel`

---

# 15. WebSocket 事件设计

连接地址：

```txt
/ws/conversation/:conversationId
```

## 15.1 task_update

```json
{
  "type": "task_update",
  "taskId": "task_001",
  "status": "running",
  "progress": 60
}
```

## 15.2 task_success

```json
{
  "type": "task_success",
  "taskId": "task_001",
  "status": "success",
  "image": {
    "id": "img_002",
    "url": "https://example.com/result.png"
  }
}
```

## 15.3 task_failed

```json
{
  "type": "task_failed",
  "taskId": "task_001",
  "status": "failed",
  "errorMessage": "图片生成失败，请稍后重试"
}
```

---

# 16. DeepSeek 任务规划设计

DeepSeek 不直接返回自然语言说明，而是必须返回结构化 JSON。

## 16.1 DeepSeek 负责输出的结构

```json
{
  "taskType": "text_to_image | image_to_image | text_image_to_image | image_chat | unknown",
  "imageCount": 1,
  "generationMode": "parallel | serial",
  "useHistoryImage": true,
  "useUploadedImages": false,
  "needGenerate": true,
  "tasks": [
    {
      "index": 1,
      "prompt": "给图片模型使用的完整中文提示词",
      "inputImageIds": [],
      "size": "1024x1024"
    }
  ]
}
```

## 16.2 DeepSeek Prompt 规则要求

后端必须内置规划 Prompt，明确要求模型：

1. 根据用户输入判断任务类型。
2. 根据上传图片、最近生成图片、历史消息识别上下文。
3. 如果用户说“第一张、第二张、第三张”，必须拆分任务。
4. 如果后一张依赖前一张，必须使用串行模式。
5. 如果任务独立，则使用并行模式。
6. 必须结合 `bizType` 与 `sceneType` 提升 Prompt 质量。
7. 严格返回 JSON，禁止返回解释性自然语言。

---

# 17. 多轮会话与上下文策略

## 17.1 必须保存所有轮次消息

不能只依赖前端缓存，必须入库。

## 17.2 上下文简化传递策略

调用 DeepSeek 时，不要无脑塞全部历史。

建议传入：

- 当前会话 ID
- `bizType`
- `sceneType`
- 最近 5~10 条关键消息
- `latestImageId`
- 当前上传图片
- 当前用户输入

## 17.3 latestImage 默认继承规则

当满足以下条件时：

- 本轮无新上传图片
- 用户输入含“这张”“上一张”“继续”“把它”这类引用词
- 当前存在 `latestImageId`

则自动将 `latestImageId` 作为输入图片。

---

# 18. 并行 / 串行策略

## 18.1 并行生成

适用于：

- 生成 3 张不同风格海报
- 生成 2 张不同穿搭灵感图
- 多任务彼此独立

## 18.2 串行生成

适用于：

- 第一张生成，第二张基于第一张修改
- 第一张换主体，第二张继续换背景
- 多轮连续编辑

---

# 19. 队列与任务处理

使用 BullMQ。

## 19.1 队列职责

- 接收生成任务
- 管理任务执行状态
- 控制并发
- 支持失败重试
- 记录执行日志

## 19.2 Processor 逻辑

单个任务执行步骤：

1. 读取任务信息
2. 获取会话上下文
3. 调用 DeepSeek 生成结构化任务
4. 生成最终 Prompt
5. 调用 GPT Image 2
6. 保存结果图片
7. 更新 DB 状态
8. 推送 WebSocket 事件

---

# 20. SDK 设计

需要提供一个前端 SDK，便于其他项目接入。

## 20.1 SDK 目录

```txt
packages/sdk/
├── src/
│   ├── client.ts
│   ├── generation.ts
│   ├── upload.ts
│   ├── websocket.ts
│   └── index.ts
```

## 20.2 SDK 能力

- 上传图片
- 创建生成任务
- 获取会话详情
- 获取任务详情
- 重试任务
- 建立 WebSocket 连接

---

# 21. 关键业务场景要求

## 21.1 二手车创意生图

必须支持：

- 上传车图
- 换背景
- 调整车身颜色
- 生成营销图
- 地下车库 / 雨夜高架 / 展厅图
- 内饰优化 / 清洁感增强
- 多轮连续编辑

## 21.2 服装灵感生图

必须支持：

- 上传服装图
- 参考图生成灵感图
- 风格迁移
- Lookbook 风格图
- 模特场景图
- 多图参考（款式图 + 风格图）
- 多轮连续调整

---

# 22. 第一阶段开发范围（MVP）

本阶段必须完成：

1. Monorepo 初始化
2. React Web 应用搭建
3. React 组件库搭建
4. NestJS 后端搭建
5. 上传图片
6. 文生图
7. 图生图
8. 文 + 图生图
9. 多图上传
10. 多图参考生成
11. 多轮图片对话
12. 多任务生成
13. WebSocket 状态推送
14. 任务队列
15. 图片下载
16. 二手车业务示例配置
17. 服装业务示例配置

---

# 23. 第二阶段可扩展功能

暂不强制，但架构预留：

- 用户系统
- 积分系统
- 生成历史中心
- 提示词收藏
- 模型切换
- 生成参数模板
- 管理后台
- 局部编辑 / 蒙版编辑
- Excel / PDF / Word 导出
- 视频生成接入
- 数字人接入

---

# 24. UI 要求

前端风格要求：

- 简洁、科技感、企业级
- 支持暗黑 / 明亮主题
- 不做花哨视觉
- 强调功能清晰、状态清晰、图片展示清晰

页面布局建议：

- 左侧：会话 / 历史 / 示例业务切换
- 中间：对话区与结果区
- 底部：输入区、上传区、比例选择、数量选择、发送按钮
- 右侧（可选）：任务状态面板

---

# 25. 编码规范要求

1. 前后端全部使用 TypeScript。
2. 共享类型放入 `packages/types`。
3. 不允许把业务类型写死在组件内部。
4. 不允许前端直接调用模型 API。
5. 不允许写死 API Key。
6. 所有接口必须有 DTO / 类型校验。
7. 所有异步任务必须可追踪状态。
8. 所有图片生成结果必须能回溯其来源与 Prompt。
9. 组件必须可被其他项目引用。
10. 代码需保留合理注释与 README。

---

# 26. 验收标准

## 26.1 通用能力验收

- 能输入文字生成图片
- 能上传图片并编辑图片
- 能上传多张图并参考生成
- 能在同一会话中连续修改图片
- 能生成多张图
- 能处理多指令并拆分任务
- 能展示实时状态
- 能下载结果图

## 26.2 二手车业务验收

- 能上传车图生成营销图
- 能基于上一张图继续调整
- 能切换不同场景类型
- 能展示二手车示例页面

## 26.3 服装业务验收

- 能上传服装图生成灵感图
- 能上传参考风格图
- 能做多轮调整
- 能展示服装示例页面

## 26.4 复用能力验收

- `packages/react` 能在 `apps/web` 中正常引用
- 组件支持 `bizType="used_car"` 和 `bizType="fashion"`
- 后端接口无需改动即可服务两个业务

---

# 27. 建议开发顺序

## 阶段 1：工程搭建

1. 初始化 monorepo
2. 初始化 web / server / packages
3. 配置 TS / ESLint / Prettier
4. 打通共享类型

## 阶段 2：后端基础能力

1. NestJS 基础模块
2. Prisma & DB
3. 上传模块
4. 生成模块
5. DeepSeek 服务
6. GPT Image 2 服务
7. 队列模块
8. WebSocket 模块

## 阶段 3：前端能力

1. 输入组件
2. 上传组件
3. 图片结果组件
4. 消息区
5. 状态区
6. 会话管理

## 阶段 4：业务接入

1. 接入二手车业务配置
2. 接入服装业务配置
3. 接入 Prompt 模板
4. 提供演示页面

## 阶段 5：可复用能力输出

1. 抽离 React 组件库
2. 抽离 SDK
3. 编写使用示例
4. 编写 README

---

# 28. 给 Codex 的执行指令

请严格按照本文档开发项目 **NovaCanvas AI（多业务通用版）**。

## 强制要求

1. 使用 **Monorepo** 结构。
2. 前端使用 **React + TypeScript + Arco Design + TailwindCSS + SCSS**。
3. 后端使用 **NestJS + TypeScript + Prisma + Redis + BullMQ + WebSocket**。
4. LLM 使用 **DeepSeek**。
5. 图片模型使用 **GPT Image 2**。
6. 必须支持 **二手车** 与 **服装** 两个业务示例。
7. 必须输出 **可独立运行的 Web 应用**。
8. 必须输出 **可复用的 React 组件库**。
9. 必须输出 **可复用的 SDK**。
10. 不允许把业务逻辑写死为“二手车专用”。
11. 不允许只做静态页面，必须前后端打通。
12. 不允许前端直连模型 API。

## 交付内容

- 可运行代码
- 环境变量示例 `.env.example`
- 初始化 README
- API 文档
- React 组件使用示例
- 二手车示例页面
- 服装示例页面

---

# 29. 补充说明

本项目未来要作为：

- 二手车创意生图模块
- 服装灵感生图模块
- 其他业务的 AI 图片生成能力中台

因此，当前开发时的最高优先级不是“先把一个页面写出来”，而是：

**把底层能力做对，把业务抽象做好，把组件可复用能力做出来。**

---

# 30. 最终一句话总结

NovaCanvas AI 应被开发为：

**一个支持多业务场景、可独立部署、可组件化接入、可持续扩展的企业级 AI 图片生成平台。**
