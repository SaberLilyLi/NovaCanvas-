# NovaCanvas AI 完整开发文档

## 1. 项目说明

NovaCanvas AI 是一个多业务通用 AI 图片生成平台，当前包含：

- 通用图片创作工作台
- 二手车创意生图示例
- 服装灵感生图示例
- 可复用 React 组件库
- 可复用 TypeScript SDK
- 通用 NestJS AI 生图服务
- DeepSeek 任务规划
- GPT Image 2 图片生成与编辑
- 多图上传、多图参考、多任务生成、多轮编辑
- WebSocket 实时任务推送
- Prisma、PostgreSQL、Redis、BullMQ 生产能力

业务差异通过配置和 Prompt 模板实现，底层生成服务不是二手车或服装专用服务。

---

## 2. 技术栈

### 2.1 Monorepo

- pnpm Workspace
- Turborepo
- TypeScript

### 2.2 前端

- React 18
- TypeScript
- Vite
- Arco Design
- TailwindCSS
- SCSS
- Zustand
- TanStack Query
- Socket.IO Client
- Lucide React

### 2.3 后端

- Node.js
- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Socket.IO / NestJS WebSocket
- class-validator
- Multer

### 2.4 AI 模型

- DeepSeek：理解用户指令、拆分任务、判断并行或串行、生成结构化 Prompt
- GPT Image 2：文生图、图生图、文图生图和连续图片编辑

### 2.5 文件存储

当前默认使用后端本地目录：

```text
apps/server/uploads/
```

生成文件通过以下地址访问：

```text
http://localhost:3001/uploads/{filename}
```

架构已经预留 S3、MinIO 和 OSS 配置。

---

## 3. 项目目录

```text
NovaCanvas/
├─ apps/
│  ├─ web/                         独立 React Web 应用
│  │  ├─ src/
│  │  │  ├─ pages/
│  │  │  │  ├─ playground/        通用创作页面
│  │  │  │  ├─ used-car-demo/     二手车示例页面
│  │  │  │  └─ fashion-demo/      服装示例页面
│  │  │  ├─ styles/
│  │  │  ├─ App.tsx
│  │  │  └─ main.tsx
│  │  ├─ vite.config.ts
│  │  ├─ tailwind.config.js
│  │  └─ package.json
│  │
│  └─ server/                      NestJS 后端
│     ├─ prisma/
│     │  └─ schema.prisma          数据库模型
│     ├─ src/
│     │  ├─ modules/
│     │  │  ├─ conversation/       会话查询
│     │  │  ├─ data/               内存/Prisma 数据层
│     │  │  ├─ generation/         任务创建与执行
│     │  │  ├─ health/             健康检查
│     │  │  ├─ model/              DeepSeek/GPT Image 适配
│     │  │  ├─ realtime/           WebSocket 推送
│     │  │  ├─ storage/            图片存储
│     │  │  └─ upload/             图片上传
│     │  ├─ prisma/
│     │  ├─ app.module.ts
│     │  └─ main.ts
│     ├─ uploads/                   本地图片文件
│     └─ package.json
│
├─ packages/
│  ├─ react/                        可复用 React 创作组件
│  ├─ sdk/                          HTTP/WebSocket SDK
│  ├─ types/                        前后端共享类型
│  ├─ biz-config/                   多业务配置
│  └─ prompt-presets/               Prompt 模板和规划规则
│
├─ docs/
│  ├─ api.md                        REST API 文档
│  ├─ websocket.md                  WebSocket 文档
│  ├─ architecture.md               架构文档
│  ├─ prompt-strategy.md            Prompt 策略
│  └─ development.md                本文档
│
├─ .env.example                     后端环境变量示例
├─ docker-compose.yml               PostgreSQL 和 Redis
├─ pnpm-workspace.yaml              Workspace 配置
├─ turbo.json                       Monorepo 任务配置
├─ tsconfig.base.json               公共 TypeScript 配置
└─ package.json                     根命令
```

---

## 4. 环境要求

建议安装：

- Node.js 20 或更高版本
- pnpm 10
- Docker Desktop
- Git

检查版本：

```bash
node --version
pnpm --version
docker --version
docker compose version
```

如果尚未安装 pnpm：

```bash
npm install -g pnpm@10.12.1
```

Windows PowerShell 如果因为执行策略无法运行 `pnpm.ps1`，可以使用：

```powershell
pnpm.cmd --version
```

下文所有 `pnpm` 命令在该情况下均可替换为 `pnpm.cmd`。

---

## 5. 首次安装

进入项目根目录：

```powershell
cd F:\NovaCanvas
```

安装所有 Workspace 依赖：

```bash
pnpm install
```

复制环境变量：

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

macOS/Linux：

```bash
cp .env.example .env
```

注意：

- 不要将真实 API Key 写入 `.env.example`。
- `.env` 已被 Git 忽略，只用于本机或服务器环境。
- 前端不允许保存或直接调用模型 Key。

---

## 6. 环境变量

后端读取项目根目录的 `.env`。

```env
NODE_ENV=development
PORT=3001
WEB_ORIGIN=http://localhost:5173

DATABASE_URL=postgresql://novacanvas:novacanvas@localhost:5432/novacanvas?schema=public
REDIS_URL=redis://localhost:6379

NOVACANVAS_RUNTIME=mock
NOVACANVAS_DATA_RUNTIME=memory
NOVACANVAS_QUEUE_RUNTIME=memory

DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_BASE_URL=https://api.openai.com/v1

STORAGE_DRIVER=local
```

### 6.1 AI 运行模式

```env
NOVACANVAS_RUNTIME=mock
```

- 不调用真实模型。
- 不需要 API Key。
- 生成本地 SVG 占位图片。
- 适合开发 UI 和接口联调。

```env
NOVACANVAS_RUNTIME=live
```

- DeepSeek 和 GPT Image 2 使用真实 API。
- 必须配置有效的 `DEEPSEEK_API_KEY` 和 `OPENAI_API_KEY`。

### 6.2 数据运行模式

```env
NOVACANVAS_DATA_RUNTIME=memory
```

- 会话、消息、图片和任务保存在进程内存。
- 重启后端后数据会丢失。
- 不依赖 PostgreSQL。

```env
NOVACANVAS_DATA_RUNTIME=prisma
```

- 数据通过 Prisma 保存到 PostgreSQL。
- 需要启动 Docker PostgreSQL 并初始化数据库。

### 6.3 队列运行模式

```env
NOVACANVAS_QUEUE_RUNTIME=memory
```

- 使用进程内异步任务。
- 不依赖 Redis。
- 模型调用失败时任务标记为 `failed`，不会终止后端。

```env
NOVACANVAS_QUEUE_RUNTIME=bullmq
```

- 使用 Redis + BullMQ。
- 支持任务重试、并发控制和任务追踪。

### 6.4 前端 API 地址

开发环境默认请求：

```text
http://localhost:3001
```

如需修改，在 `apps/web/.env.local` 创建：

```env
VITE_API_BASE_URL=http://localhost:3001
```

生产环境改为实际后端域名：

```env
VITE_API_BASE_URL=https://api.example.com
```

修改 Vite 环境变量后需要重新启动或重新构建前端。

---

## 7. 启动方式

### 7.1 方式一：Mock 模式，最简单

适合首次运行和前端开发，不需要 Docker 和模型 Key。

`.env`：

```env
NOVACANVAS_RUNTIME=mock
NOVACANVAS_DATA_RUNTIME=memory
NOVACANVAS_QUEUE_RUNTIME=memory
```

同时启动前后端：

```bash
pnpm dev
```

访问：

```text
前端：http://localhost:5173
后端：http://localhost:3001
健康检查：http://localhost:3001/health
```

### 7.2 方式二：真实模型，不启动 Docker

适合验证 DeepSeek 和 GPT Image 2。

`.env`：

```env
NOVACANVAS_RUNTIME=live
NOVACANVAS_DATA_RUNTIME=memory
NOVACANVAS_QUEUE_RUNTIME=memory

DEEPSEEK_API_KEY=你的DeepSeekKey
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

OPENAI_API_KEY=你的图片模型Key
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_BASE_URL=你的OpenAI兼容API地址
```

启动：

```bash
pnpm dev
```

此方式使用真实模型，但后端重启后会话数据会丢失。

### 7.3 方式三：完整开发模式

完整模式使用：

- 真实 AI 模型
- PostgreSQL
- Prisma
- Redis
- BullMQ

`.env`：

```env
NOVACANVAS_RUNTIME=live
NOVACANVAS_DATA_RUNTIME=prisma
NOVACANVAS_QUEUE_RUNTIME=bullmq
```

先启动 Docker Desktop，再执行：

```bash
docker compose up -d
```

确认容器：

```bash
docker compose ps
```

首次启动或 Prisma Schema 变化后执行：

```bash
pnpm db:generate
pnpm db:push
```

然后启动项目：

```bash
pnpm dev
```

---

## 8. 前后端分别启动

建议在两个终端中运行。

### 8.1 启动后端

终端一：

```bash
pnpm dev:server
```

等价命令：

```bash
pnpm --filter @novacanvas/server dev
```

后端地址：

```text
http://localhost:3001
```

验证后端：

```bash
curl http://localhost:3001/health
```

Windows PowerShell：

```powershell
Invoke-RestMethod http://localhost:3001/health
```

正常响应示例：

```json
{
  "status": "ok",
  "service": "novacanvas-server",
  "runtime": "live",
  "dataRuntime": "memory",
  "queueRuntime": "memory"
}
```

### 8.2 启动前端

终端二：

```bash
pnpm dev:web
```

等价命令：

```bash
pnpm --filter @novacanvas/web dev
```

前端地址：

```text
http://localhost:5173
```

业务页面：

```text
通用创作：http://localhost:5173/
二手车：http://localhost:5173/used-car
服装灵感：http://localhost:5173/fashion
```

---

## 9. Docker 使用

`docker-compose.yml` 当前包含：

- PostgreSQL 16
- Redis 7

### 9.1 启动全部容器

```bash
docker compose up -d
```

### 9.2 只启动 PostgreSQL

```bash
docker compose up -d postgres
```

### 9.3 只启动 Redis

```bash
docker compose up -d redis
```

### 9.4 查看状态

```bash
docker compose ps
```

### 9.5 查看日志

```bash
docker compose logs -f
```

单独查看：

```bash
docker compose logs -f postgres
docker compose logs -f redis
```

### 9.6 停止容器

```bash
docker compose stop
```

### 9.7 停止并删除容器

```bash
docker compose down
```

### 9.8 删除容器和数据卷

```bash
docker compose down -v
```

警告：`-v` 会删除 PostgreSQL 和 Redis 的持久化数据。

### 9.9 默认连接信息

PostgreSQL：

```text
Host: localhost
Port: 5432
Database: novacanvas
Username: novacanvas
Password: novacanvas
```

Redis：

```text
Host: localhost
Port: 6379
URL: redis://localhost:6379
```

---

## 10. Prisma 数据库

Prisma Schema：

```text
apps/server/prisma/schema.prisma
```

生成 Prisma Client：

```bash
pnpm db:generate
```

同步 Schema 到数据库：

```bash
pnpm db:push
```

等价命令：

```bash
pnpm --filter @novacanvas/server prisma:generate
pnpm --filter @novacanvas/server prisma:push
```

执行 `db:push` 前必须保证：

1. Docker Desktop 已运行。
2. PostgreSQL 容器状态正常。
3. `.env` 中 `DATABASE_URL` 正确。

---

## 11. 常用开发命令

安装依赖：

```bash
pnpm install
```

同时启动所有应用：

```bash
pnpm dev
```

启动前端：

```bash
pnpm dev:web
```

启动后端：

```bash
pnpm dev:server
```

全仓类型检查：

```bash
pnpm typecheck
```

全仓生产构建：

```bash
pnpm build
```

格式化代码：

```bash
pnpm format
```

单独构建前端：

```bash
pnpm --filter @novacanvas/web build
```

单独构建后端：

```bash
pnpm --filter @novacanvas/server build
```

---

## 12. 生产构建和运行

### 12.1 构建全部项目

```bash
pnpm install --frozen-lockfile
pnpm build
```

主要产物：

```text
apps/web/dist/                 前端静态文件
apps/server/dist/              后端编译文件
packages/types/dist/           共享类型
packages/sdk/dist/             SDK
packages/react/dist/           React 组件类型构建
packages/biz-config/dist/      业务配置
packages/prompt-presets/dist/  Prompt 模板
```

### 12.2 启动生产后端

项目根目录执行：

```bash
pnpm --filter @novacanvas/server start
```

该命令运行：

```bash
node apps/server/dist/src/main.js
```

部署服务器必须提供 `.env` 或等效系统环境变量。

### 12.3 部署生产前端

将以下目录部署至 Nginx、CDN、OSS 或静态托管服务：

```text
apps/web/dist/
```

构建前设置：

```env
VITE_API_BASE_URL=https://api.example.com
```

Vite 环境变量会写入构建产物，因此更换 API 地址后必须重新构建。

### 12.4 Nginx SPA 配置示例

```nginx
server {
    listen 80;
    server_name canvas.example.com;

    root /var/www/novacanvas/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

后端应单独部署在 API 域名，并将 `.env` 中：

```env
WEB_ORIGIN=https://canvas.example.com
```

---

## 13. 前端组件使用

```tsx
import '@arco-design/web-react/dist/css/arco.css';
import { NovaCanvasComposer } from '@novacanvas/react';

export function CarStudio() {
  return (
    <NovaCanvasComposer
      bizType="used_car"
      sceneType="creative_poster"
      apiBaseUrl="http://localhost:3001"
      enableMultiImage
      enableConversation
      enableImageEdit
      enableDownload
    />
  );
}
```

服装业务：

```tsx
<NovaCanvasComposer
  bizType="fashion"
  sceneType="inspiration"
  apiBaseUrl="http://localhost:3001"
  enableMultiImage
  enableConversation
  enableImageEdit
/>
```

---

## 14. SDK 使用

```ts
import { createNovaCanvasClient } from '@novacanvas/sdk';

const client = createNovaCanvasClient({
  baseUrl: 'http://localhost:3001',
});

const result = await client.createGeneration({
  bizType: 'fashion',
  sceneType: 'lookbook',
  prompt: '生成两张极简 Lookbook',
  count: 2,
  size: '1024x1536',
});

const disconnect = client.connectConversation(
  result.conversationId,
  (event) => {
    console.log(event);
  },
);

// 页面销毁时断开连接
disconnect();
```

---

## 15. API 和 WebSocket

主要 REST API：

```text
POST /api/upload/image
POST /api/generation/create
GET  /api/conversation/:conversationId
GET  /api/generation/task/:taskId
POST /api/generation/task/:taskId/retry
POST /api/generation/task/:taskId/cancel
GET  /health
```

WebSocket：

```text
Namespace: /conversation
Path: /ws
```

事件：

```text
task_update
task_success
task_failed
```

详细说明：

- [API 文档](api.md)
- [WebSocket 文档](websocket.md)

---

## 16. 常见问题

### 16.1 页面生成的是占位 SVG

检查：

```env
NOVACANVAS_RUNTIME=live
```

如果是 `mock`，系统会故意生成本地占位图。

### 16.2 修改 `.env` 后没有生效

环境变量只在后端进程启动时读取，需要重启后端：

```bash
pnpm dev:server
```

### 16.3 Docker 命令无法连接

先启动 Docker Desktop，等待 Docker Engine 就绪：

```bash
docker info
```

然后再执行：

```bash
docker compose up -d
```

### 16.4 数据库连接失败

检查容器：

```bash
docker compose ps
docker compose logs postgres
```

检查 `.env`：

```env
DATABASE_URL=postgresql://novacanvas:novacanvas@localhost:5432/novacanvas?schema=public
```

### 16.5 Redis 或 BullMQ 连接失败

检查：

```bash
docker compose logs redis
```

开发阶段可以临时使用：

```env
NOVACANVAS_QUEUE_RUNTIME=memory
```

### 16.6 重启后端后会话丢失

`NOVACANVAS_DATA_RUNTIME=memory` 时属于正常行为。

需要持久化时：

```env
NOVACANVAS_DATA_RUNTIME=prisma
```

并启动 PostgreSQL、执行 `pnpm db:push`。

### 16.7 WebSocket 断线

前端会自动重连，HTTP 会话查询作为状态同步兜底。检查：

- 后端 `3001` 端口是否在线
- `/health` 是否返回 `ok`
- `WEB_ORIGIN` 是否包含前端域名
- 反向代理是否支持 WebSocket Upgrade

### 16.8 端口被占用

Windows 查看端口：

```powershell
Get-NetTCPConnection -LocalPort 3001,5173 -State Listen
```

也可以修改：

```env
PORT=3002
```

前端端口在 `apps/web/vite.config.ts` 中配置。

---

## 17. 推荐开发流程

日常前端开发：

```env
NOVACANVAS_RUNTIME=mock
NOVACANVAS_DATA_RUNTIME=memory
NOVACANVAS_QUEUE_RUNTIME=memory
```

```bash
pnpm dev
```

真实模型联调：

```env
NOVACANVAS_RUNTIME=live
NOVACANVAS_DATA_RUNTIME=memory
NOVACANVAS_QUEUE_RUNTIME=memory
```

完整集成测试：

```env
NOVACANVAS_RUNTIME=live
NOVACANVAS_DATA_RUNTIME=prisma
NOVACANVAS_QUEUE_RUNTIME=bullmq
```

```bash
docker compose up -d
pnpm db:generate
pnpm db:push
pnpm dev
```

提交代码前：

```bash
pnpm typecheck
pnpm build
```
