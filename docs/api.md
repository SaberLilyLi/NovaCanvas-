# API

服务地址默认为 `http://localhost:3001`，REST 前缀为 `/api`。

## 上传图片

`POST /api/upload/image`

`multipart/form-data` 字段：

- `file`：图片文件，最大 15 MB
- `conversationId`：可选
- `userId`：可选

返回 `imageId`、可访问 URL 与完整图片对象。

## 创建生成任务

`POST /api/generation/create`

```json
{
  "conversationId": "可选",
  "userId": "demo-user",
  "bizType": "fashion",
  "sceneType": "lookbook",
  "prompt": "参考单品生成两张极简 Lookbook",
  "imageIds": ["img_xxx"],
  "count": 2,
  "size": "1024x1536",
  "metadata": { "season": "summer" }
}
```

`count` 范围为 1 到 4。返回会话 ID 与任务列表。任务由 DeepSeek 拆分，独立任务并行，
有依赖的任务串行。

## 会话与任务

- `GET /api/conversation/:conversationId`
- `GET /api/generation/task/:taskId`
- `POST /api/generation/task/:taskId/retry`
- `POST /api/generation/task/:taskId/cancel`

会话响应包含 `messages`、`images`、`tasks` 与 `latestImageId`。连续编辑没有新上传图且包含
“这张”“上一张”“继续”“把它”等引用时，服务会自动继承 `latestImageId`。

## 错误格式

DTO 使用 `class-validator` 校验。NestJS 默认错误响应包含 `statusCode`、`message` 与 `error`。
