# GenerateCore 图片生成中台架构升级方案（企业级版）

## 一、项目背景

当前项目已经完成：

- 自由生图（Text To Image）
- WebSocket 图片生成 Demo

但项目后续需要复用于：

1. 二手车创意生图
2. 服装灵感生图
3. AI 换衣
4. 海报生成
5. 图片编辑
6. Facemini 多 Agent 平台
7. AI Composer

目前存在问题：

- GeneratePanel 直接依赖 WebSocket
- UI 与通信协议强耦合
- 无法快速切换轮询方案
- 无法统一任务管理
- 无法统一历史记录
- 无法统一状态恢复
- 后续扩展成本高

因此需要进行企业级架构升级。

---

# 二、改造目标

实现 GenerateCore 图片生成中台。

核心原则：

UI 层永远不知道底层通信方式。

支持：

- Polling（默认）
- WebSocket（兼容）
- SSE（预留）

未来业务模块全部复用同一套核心能力。

---

# 三、技术栈

## Frontend

- React
- TypeScript
- Zustand
- Arco Design
- TailwindCSS

## Architecture

- Provider Pattern
- Task Manager
- Store Center
- Hook Encapsulation

---

# 四、最终架构

```text
GeneratePanel
       │
       ▼
 useGenerate
       │
       ▼
 TaskManager
       │
       ▼
 GenerateProvider
       │
 ┌─────┼─────┐
 │     │     │
 ▼     ▼     ▼
Polling WebSocket SSE
Provider Provider Provider
```

---

# 五、目录结构

```text
src/

generate-core/

├── providers/
│
├── GenerateProvider.ts
├── PollingProvider.ts
├── WebSocketProvider.ts
├── SSEProvider.ts
└── index.ts

├── task/
│
├── TaskTypes.ts
├── TaskManager.ts
└── TaskStore.ts

├── hooks/
│
└── useGenerate.ts

├── components/
│
└── GeneratePanel.tsx

├── config/
│
└── generate.config.ts

├── services/
│
├── GenerateHistory.ts
└── LocalTaskPersistence.ts

├── utils/
│
├── polling.ts
├── retry.ts
└── storage.ts

└── types/
    └── generate.types.ts
```

---

# 六、GenerateTask 统一模型

```ts
export interface GenerateTask {
  taskId: string;

  type: 'free' | 'edit' | 'fashion' | 'car' | 'poster' | 'avatar';

  status: 'pending' | 'running' | 'success' | 'failed';

  progress: number;

  prompt?: string;

  images: string[];

  error?: string;

  createdAt: number;

  updatedAt: number;
}
```

---

# 七、GenerateProvider

统一通信接口。

```ts
export interface GenerateProvider {
  submitTask(params: GenerateParams): Promise<SubmitResult>;

  queryTask(taskId: string): Promise<TaskStatus>;

  subscribeTask?(taskId: string, callback: (status: TaskStatus) => void): () => void;
}
```

---

# 八、PollingProvider（默认实现）

## 创建任务

```http
POST /api/generate
```

返回：

```json
{
  "taskId": "123"
}
```

---

## 查询状态

```http
GET /api/generate/task/{taskId}
```

返回：

```json
{
  "taskId": "123",
  "status": "running",
  "progress": 65
}
```

---

## 默认策略

```ts
const pollingConfig = {
  interval: 2000,
  maxRetry: 3,
  timeout: 300000,
};
```

---

## 功能要求

支持：

- 自动轮询
- 自动停止
- 自动重试
- 超时处理
- 失败处理
- 页面刷新恢复

---

# 九、WebSocketProvider（兼容实现）

保留现有 WebSocket 逻辑。

改造为：

```ts
class WebSocketProvider
  implements GenerateProvider
```

支持：

- submitTask
- queryTask
- subscribeTask

---

## 不允许

组件直接调用：

```ts
socket.send();
```

---

## 必须

通过：

```ts
provider.submitTask();
```

调用。

---

# 十、SSEProvider（预留）

当前仅创建接口。

```ts
class SSEProvider
  implements GenerateProvider
```

暂不实现业务逻辑。

用于未来服务端推送。

---

# 十一、TaskStore

统一任务状态管理。

使用 Zustand。

---

## State

```ts
tasks: GenerateTask[]
```

---

## Actions

```ts
addTask();

updateTask();

removeTask();

clearTask();

getTask();

getRunningTasks();

getFinishedTasks();
```

---

# 十二、TaskManager

统一任务调度中心。

---

## 职责

创建任务

恢复任务

启动轮询

停止轮询

恢复轮询

销毁轮询

页面刷新恢复

断网恢复

自动清理

---

## 生命周期

```text
提交任务
   │
   ▼
TaskManager
   │
   ▼
TaskStore
   │
   ▼
UI更新
```

---

# 十三、页面刷新恢复

## 保存内容

```json
{
  "taskId": "123",
  "status": "running"
}
```

---

## 存储方式

```ts
localStorage;
```

---

## 恢复机制

页面刷新：

```text
读取缓存
   │
   ▼
恢复TaskStore
   │
   ▼
恢复轮询
```

---

# 十四、GenerateHistory

统一历史记录模块。

---

## 支持

- 文生图
- 图生图
- 文图生图
- 图片编辑

---

## 后续复用

- 二手车项目
- 服装项目
- Facemini

统一读取。

---

# 十五、useGenerate

统一业务入口。

---

## 对外暴露

```ts
const { submit, stop, retry, tasks } = useGenerate();
```

---

## 禁止

```ts
socket.send();

axios.post();

fetch();
```

出现在组件层。

---

# 十六、GeneratePanel职责

只负责：

- Prompt输入
- 图片上传
- 状态展示
- 图片展示

---

禁止：

- 管理Socket
- 管理轮询
- 管理任务
- 管理状态恢复

---

# 十七、Provider配置

```ts
export const generateConfig = {
  provider: 'polling',
};
```

---

## 支持

```ts
provider: 'polling';

provider: 'websocket';

provider: 'sse';
```

---

## 切换要求

切换 Provider：

```text
无需修改UI代码
无需修改业务代码
```

---

# 十八、未来兼容能力

必须支持：

- 文生图
- 图生图
- 文图生图
- 图片编辑
- AI换衣
- 批量生成
- 多图生成
- 海报生成
- 二手车创意图
- 服装灵感图
- Agent图片生成

---

# 十九、开发规范

## 必须遵守

高内聚

低耦合

单一职责

可测试

可扩展

可抽离

---

## 禁止

业务代码写死在组件中

业务代码写死在 Provider 中

模块互相引用

循环依赖

---

# 二十、最终目标

构建统一 GenerateCore 图片生成中台。

实现：

```text
GenerateCore

├── GeneratePanel
├── useGenerate
├── TaskManager
├── TaskStore
├── GenerateHistory
│
├── PollingProvider
├── WebSocketProvider
└── SSEProvider
```

未来：

- 二手车项目
- 服装项目
- Facemini
- AI Composer

全部通过 GenerateCore 直接复用。

做到：

一次开发

多项目复用

统一维护

统一升级

企业级可扩展。
