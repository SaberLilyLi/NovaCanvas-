# NovaCanvas AI

NovaCanvas AI 是面向多业务场景的通用 AI 图片生成平台。仓库包含独立 Web
应用、可嵌入 React 组件库、浏览器 SDK，以及基于 NestJS 的通用图片生成服务。

完整安装、前后端启动、Docker、Prisma 和生产构建说明请阅读：
[完整开发文档](docs/development.md)。

当前内置两个完整业务示例：

- 二手车创意生图：营销海报、雨夜高架、地下车库、精品展厅、内饰焕新
- 服装灵感生图：穿搭灵感、Lookbook、风格迁移、模特场景、面料情绪

业务差异位于 `packages/biz-config` 与 `packages/prompt-presets`，生成服务本身不依赖特定行业。

## 技术架构

- Monorepo：pnpm workspace + Turborepo
- Web：React、TypeScript、Arco Design、TailwindCSS、SCSS、Zustand、TanStack Query
- Server：NestJS、Prisma、PostgreSQL、Redis、BullMQ、Socket.IO
- AI：DeepSeek 任务规划、GPT Image 2 图片生成与编辑
- 复用产物：`@novacanvas/react`、`@novacanvas/sdk`、`@novacanvas/types`

## 快速启动

需要 Node.js 20+ 与 pnpm。

```bash
pnpm install
cp .env.example .env
pnpm dev
```

默认使用 `NOVACANVAS_RUNTIME=mock`，无需数据库、Redis 或模型密钥即可走通上传、任务拆分、
队列式进度、WebSocket、连续编辑与下载。访问：

- Web：http://localhost:5173
- API：http://localhost:3001
- 健康检查：http://localhost:3001/health

## 生产模式

1. 启动 PostgreSQL 与 Redis：

```bash
docker compose up -d
```

2. 将 `.env` 中 `NOVACANVAS_RUNTIME` 改为 `live`，填写 `DEEPSEEK_API_KEY` 与
   `OPENAI_API_KEY`。真实模型可先配合内存数据和队列运行。
3. 初始化数据库并启动：

```bash
pnpm db:generate
pnpm db:push
pnpm dev
```

完整生产基础设施还需设置 `NOVACANVAS_DATA_RUNTIME=prisma` 与
`NOVACANVAS_QUEUE_RUNTIME=bullmq`。此时使用 Prisma 持久化、BullMQ 重试与并发控制、
DeepSeek JSON 规划和 GPT Image 2 生成/编辑接口。对象存储接口已隔离在 Storage 模块，
MVP 默认使用本地文件目录。

## React 组件接入

```tsx
import '@arco-design/web-react/dist/css/arco.css';
import { NovaCanvasComposer } from '@novacanvas/react';

export function CarCreativeStudio() {
  return (
    <NovaCanvasComposer
      bizType="used_car"
      sceneType="creative_poster"
      apiBaseUrl="https://image-api.example.com"
      enableMultiImage
      enableImageEdit
      enableConversation
      onGenerated={(images) => console.log(images)}
    />
  );
}
```

将 `bizType` 改为 `fashion`，后端接口无需任何修改。

## SDK 接入

```ts
import { createNovaCanvasClient } from '@novacanvas/sdk';

const client = createNovaCanvasClient({ baseUrl: 'http://localhost:3001' });
const result = await client.createGeneration({
  bizType: 'fashion',
  sceneType: 'lookbook',
  prompt: '参考上传单品生成极简编辑风 Lookbook',
  imageIds: ['img_xxx'],
  count: 2,
  size: '1024x1536',
});

client.connectConversation(result.conversationId, console.log);
```

## 目录

```text
apps/web                 独立 React 应用与三个业务视图
apps/server              NestJS 通用 AI 生图服务
packages/react           可复用工作台组件与 Zustand 状态
packages/sdk             HTTP + WebSocket SDK
packages/types           前后端共享类型
packages/biz-config      多业务配置
packages/prompt-presets  Prompt 模板与 DeepSeek 规划规则
docs                     架构、API、WebSocket 与 Prompt 文档
```

详细接口见 [docs/api.md](docs/api.md)，架构说明见
[docs/architecture.md](docs/architecture.md)。
