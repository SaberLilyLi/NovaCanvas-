# AI Studio SDK 使用文档

## 交付内容

本文件夹包含可安装的 SDK 包：

```bash
company-ai-studio-sdk-0.1.1.tgz
```

SDK 包名：

```bash
@company/ai-studio-sdk
```

## 安装

在业务项目中安装本地 tarball：

```bash
pnpm add ./company-ai-studio-sdk-0.1.1.tgz
```

如果 tarball 不在当前业务项目目录中，使用绝对路径：

```bash
pnpm add F:\ai-composer\ai-studio-sdk-delivery\company-ai-studio-sdk-0.1.1.tgz
```

需要业务项目自行安装 peer dependency：

```bash
pnpm add react react-dom
```

Vue 项目：

```bash
pnpm add vue
```

## 样式引入

必须在业务项目入口引入样式：

```ts
import "@company/ai-studio-sdk/styles.css";
```

## React 使用

```tsx
import { useState } from "react";
import {
  AiComposer,
  ConversationView,
  type Message
} from "@company/ai-studio-sdk/react";
import "@company/ai-studio-sdk/styles.css";

export function Demo() {
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <div>
      <ConversationView messages={messages} />
      <AiComposer
        placeholder="描述你想生成的图片，或上传参考图进行编辑..."
        uploadOptions={{ accept: ["image/*"], maxFiles: 9 }}
        showActionOptions
        actionOptions={[
          {
            id: "size",
            label: "尺寸",
            value: "1:1",
            options: [
              { label: "1:1 主图", value: "1:1" },
              { label: "3:4 详情图", value: "3:4" }
            ]
          }
        ]}
        actionHint="预计 10 秒"
        onSend={async (value, context) => {
          setMessages((items) => [
            ...items,
            {
              id: crypto.randomUUID(),
              role: "user",
              content: value,
              attachments: context.attachments
            }
          ]);

          await Promise.resolve();
        }}
      />
    </div>
  );
}
```

## Vue 使用

```ts
import { defineComponent, h, ref } from "vue";
import {
  AiComposer,
  ConversationView,
  type Message
} from "@company/ai-studio-sdk/vue";
import "@company/ai-studio-sdk/styles.css";

export default defineComponent({
  setup() {
    const messages = ref<Message[]>([]);

    return () =>
      h("div", [
        h(ConversationView, { messages: messages.value }),
        h(AiComposer, {
          placeholder: "描述你想生成的图片，或上传参考图进行编辑...",
          uploadOptions: { accept: ["image/*"], maxFiles: 9 },
          showActionOptions: true,
          actionHint: "预计 10 秒",
          onSend: async (value: string, context: { attachments: unknown[] }) => {
            messages.value = [
              ...messages.value,
              {
                id: crypto.randomUUID(),
                role: "user",
                content: value,
                attachments: context.attachments
              }
            ];

            await Promise.resolve();
          }
        })
      ]);
  }
});
```

## AiComposer 主要入参

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | `string` | `undefined` | 受控输入值。 |
| `defaultValue` | `string` | `""` | 非受控默认输入值。 |
| `defaultAttachments` | `ComposerAttachment[]` | `[]` | 默认附件。 |
| `placeholder` | `string` | 内置文案 | 输入框占位文案。 |
| `disabled` | `boolean` | `false` | 禁用输入、上传和发送。 |
| `autoFocus` | `boolean` | `false` | 自动聚焦输入框。 |
| `minRows` | `number` | `3` | 输入框最小行数。 |
| `maxRows` | `number` | `8` | 输入框最大行数。 |
| `theme` | `"light" | "dark" | "auto"` | `"auto"` | 主题标识。 |
| `uploadOptions` | `UploadPluginOptions` | `undefined` | 上传限制配置。 |
| `mentions` | `MentionItem[]` | `[]` | `@` 提及候选项。 |
| `commands` | `CommandItem[]` | `[]` | `/` 命令候选项。 |
| `showActionOptions` | `boolean` | `false` | 是否显示底部配置选项。 |
| `actionOptions` | `ComposerActionOption[]` | 内置默认值 | 底部下拉配置项。 |
| `showStopButton` | `boolean` | `false` | 是否在生成中显示 Stop。默认不显示，只禁用发送按钮等待返回。 |
| `showStatusText` | `boolean` | `false` | 是否显示左侧状态文案。 |
| `statusText` | `string` | `undefined` | 固定覆盖状态文案。 |
| `statusTextMap` | `Partial<Record<ComposerPhase, string>>` | `undefined` | 按状态配置文案，例如 `{ generating: "正在生成..." }`。 |
| `actionHint` | `ReactNode` / `string` | `undefined` | 发送按钮左侧提示文案。默认不展示。 |

## AiComposer 事件

| 事件 | 入参 | 说明 |
| --- | --- | --- |
| `onChange` | `(value: string) => void` | 输入内容变化。 |
| `onSend` | `(value, { attachments }) => void \| Promise<void>` | 发送内容。返回 Promise 时，发送按钮等待 Promise 完成后恢复。 |
| `onStop` | `() => void` | 点击 Stop。只有 `showStopButton` 开启后才会触发。 |
| `onAttachmentsChange` | `(attachments) => void` | 附件列表变化。 |
| `onAttachmentError` | `(message, file?) => void` | 上传校验失败。 |
| `onActionOptionChange` | `(id, value) => void` | 底部配置项变化。 |
| `onMentionSelect` | `(item) => void` | 选择 `@` 候选项。 |
| `onCommandSelect` | `(item) => void` | 选择 `/` 命令。 |

## uploadOptions

```ts
type UploadPluginOptions = {
  accept?: string[];
  maxFiles?: number;
  maxFileSize?: number;
};
```

示例：

```tsx
<AiComposer
  uploadOptions={{
    accept: ["image/*"],
    maxFiles: 9,
    maxFileSize: 10 * 1024 * 1024
  }}
/>
```

## actionOptions

```ts
type ComposerActionOption = {
  id: string;
  label: string;
  value: string;
  options: Array<{
    label: string;
    value: string;
  }>;
};
```

示例：

```tsx
<AiComposer
  showActionOptions
  actionOptions={[
    {
      id: "model",
      label: "模型",
      value: "wan2.7-image-pro",
      options: [
        { label: "wan2.7-image-pro", value: "wan2.7-image-pro" }
      ]
    },
    {
      id: "size",
      label: "尺寸",
      value: "1:1",
      options: [
        { label: "1:1 主图", value: "1:1" },
        { label: "3:4 详情图", value: "3:4" }
      ]
    }
  ]}
/>
```

## 图片交互

已内置以下行为：

- 上传图片后以卡片堆叠展示。
- 鼠标 hover 图片时，图片上移并放大。
- 图片名称显示在图片上方。
- 展开状态下每张图片都有独立删除按钮。
- 删除按钮为半透明样式，点击热区已扩大。
- 点击图片可打开大图预览。
- 大图预览会限制在弹窗范围内，不会撑出图片框。

## 默认发送行为

默认不显示 Stop 按钮。

发送后：

```text
phase = generating
发送按钮 disabled
等待 onSend Promise 完成
phase = idle
发送按钮恢复
```

如果业务需要中断按钮：

```tsx
<AiComposer showStopButton onStop={() => controller.abort()} />
```

## ConversationView

```tsx
<ConversationView messages={messages} />
```

支持：

- `user`
- `assistant`
- `system`
- 文本消息
- 图片附件
- 文件附件
- streaming/error/success 状态展示

## Core 入口

```ts
import {
  createAiStudio,
  SchemaValidator,
  WorkspaceFactory,
  PluginManager
} from "@company/ai-studio-sdk";
```

也可以从 core 子入口引用：

```ts
import { createAiStudio } from "@company/ai-studio-sdk/core";
```

## 子入口

```ts
import { AiComposer } from "@company/ai-studio-sdk/react";
import { AiComposer } from "@company/ai-studio-sdk/vue";
import { createAiStudio } from "@company/ai-studio-sdk/core";
import "@company/ai-studio-sdk/styles.css";
```
