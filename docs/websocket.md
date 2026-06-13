# WebSocket

NovaCanvas 使用 Socket.IO，路径为 `/ws`，命名空间为 `/conversation`。

SDK 连接示例：

```ts
client.connectConversation(conversationId, (event) => {
  console.log(event.type, event);
});
```

底层连接参数：

```ts
io('http://localhost:3001/conversation', {
  path: '/ws',
  query: { conversationId }
});
```

服务端统一发送 `task_event`，载荷类型如下：

- `task_update`：`taskId`、`status`、`progress`
- `task_success`：`taskId`、`status`、`image`
- `task_failed`：`taskId`、`status`、`errorMessage`

每个连接只加入对应会话房间，不会收到其他会话的任务事件。
