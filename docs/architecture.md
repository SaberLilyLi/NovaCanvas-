# Architecture

```text
apps/web
  -> packages/react
      -> packages/sdk
          -> NestJS REST / Socket.IO
              -> DeepSeek planner
              -> BullMQ image queue
                  -> GPT Image 2
                  -> Storage
                  -> Prisma
                  -> conversation WebSocket room
```

## 通用层与业务层

`GenerationService` 只识别共享的 `bizType`、`sceneType`、Prompt、图片 ID 与元数据。
行业标题、场景选项、快捷指令位于 `biz-config`；画质约束和行业 Prompt 位于
`prompt-presets`。增加新行业无需修改上传、队列、模型、存储或 WebSocket 模块。

## 两种运行时

- `NOVACANVAS_RUNTIME`：控制 AI 使用 mock 或 DeepSeek + GPT Image 2。
- `NOVACANVAS_DATA_RUNTIME`：控制数据使用 memory 或 Prisma/PostgreSQL。
- `NOVACANVAS_QUEUE_RUNTIME`：控制任务使用 memory 或 Redis/BullMQ。

三层运行时可独立切换，并复用相同 Controller、DTO、任务状态、Socket 事件与前端代码。

## 多轮策略

会话保存全部消息、图片和任务。规划时仅提供最近八条消息、当前上传图和
`latestImageId`，避免上下文无限增长。串行任务等待前置任务完成，并将前置结果作为下一任务参考图。

## 扩展点

- Storage 模块可替换为 S3、MinIO 或 OSS。
- Model 模块可增加其他规划模型和图片模型。
- `BizType`、配置与 Prompt 可以增加电商、海报、家居等业务。
- Auth、积分和管理后台可在 API 层外扩，不影响生成内核。
