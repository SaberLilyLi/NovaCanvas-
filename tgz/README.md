# AI Studio SDK 交付说明

## 1. 文件说明

当前交付目录：

```text
ai-studio-sdk-delivery/
├── company-ai-studio-sdk-0.1.1.tgz
├── SDK-Usage-Guide.md
├── README.md
└── ai-studio-sdk-delivery.zip
```

文件用途：

| 文件 | 说明 |
| --- | --- |
| `company-ai-studio-sdk-0.1.1.tgz` | SDK 安装包，业务项目安装这个包。 |
| `README.md` | 当前完整说明文档，包含安装、引用、配置参数、事件入参。 |
| `SDK-Usage-Guide.md` | 旧版使用说明，保留作为补充。 |
| `ai-studio-sdk-delivery.zip` | 交付压缩包，方便整体拷贝。 |

## 2. SDK 包信息

包名：

```text
@company/ai-studio-sdk
```

当前版本：

```text
0.1.1
```

支持入口：

```ts
@company/ai-studio-sdk
@company/ai-studio-sdk/react
@company/ai-studio-sdk/vue
@company/ai-studio-sdk/core
@company/ai-studio-sdk/styles.css
```

## 3. 安装

在业务项目中安装 tarball：

```bash
pnpm add ./company-ai-studio-sdk-0.1.1.tgz
```

如果使用绝对路径：

```bash
pnpm add F:\ai-composer\ai-studio-sdk-delivery\company-ai-studio-sdk-0.1.1.tgz
```

React 项目需要安装：

```bash
pnpm add react react-dom
```

Vue 项目需要安装：

```bash
pnpm add vue
```

## 4. 样式引入

必须在业务项目入口引入样式：

```ts
import "@company/ai-studio-sdk/styles.css";
```

React 项目一般放在 `main.tsx` 或 `App.tsx`。

Vue 项目一般放在 `main.ts`。

## 5. React 基础使用

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
        uploadOptions={{
          accept: ["image/*"],
          maxFiles: 9,
          maxFileSize: 10 * 1024 * 1024
        }}
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

## 6. Vue 基础使用

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
        h(ConversationView, {
          messages: messages.value
        }),
        h(AiComposer, {
          placeholder: "描述你想生成的图片，或上传参考图进行编辑...",
          uploadOptions: {
            accept: ["image/*"],
            maxFiles: 9,
            maxFileSize: 10 * 1024 * 1024
          },
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

## 7. AiComposer 配置总览

### 输入控制

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | `string` | `undefined` | 受控输入值。 |
| `defaultValue` | `string` | `""` | 非受控默认输入值。 |
| `placeholder` | `string` | 内置文案 | 输入框占位文案。 |
| `disabled` | `boolean` | `false` | 禁用输入、上传和发送按钮。 |
| `autoFocus` | `boolean` | `false` | 自动聚焦输入框。 |
| `minRows` | `number` | `3` | 输入框最小行数。 |
| `maxRows` | `number` | `8` | 输入框最大行数。 |
| `theme` | `"light" \| "dark" \| "auto"` | `"auto"` | 主题标识。 |

示例：

```tsx
<AiComposer
  placeholder="请输入生成需求"
  minRows={3}
  maxRows={8}
  autoFocus
/>
```

### 上传配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `defaultAttachments` | `ComposerAttachment[]` | `[]` | 默认附件。 |
| `uploadOptions.accept` | `string[]` | `undefined` | 允许上传的文件类型。 |
| `uploadOptions.maxFiles` | `number` | `undefined` | 最大上传数量。 |
| `uploadOptions.maxFileSize` | `number` | `undefined` | 单文件最大体积，单位 byte。 |

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

### 底部下拉配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `showActionOptions` | `boolean` | `false` | 是否展示底部配置下拉。 |
| `actionOptions` | `ComposerActionOption[]` | 内置默认值 | 下拉配置项。 |
| `onActionOptionChange` | `(id, value) => void` | `undefined` | 配置项变更回调。 |

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
  onActionOptionChange={(id, value) => {
    console.log(id, value);
  }}
/>
```

`ComposerActionOption` 类型：

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

### 状态文案配置

默认不展示左侧状态文案。

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `showStatusText` | `boolean` | `false` | 是否展示左侧状态文案。 |
| `statusText` | `string` | `undefined` | 固定覆盖状态文案。 |
| `statusTextMap` | `Partial<Record<ComposerPhase, string>>` | `undefined` | 按状态配置文案。 |

示例：

```tsx
<AiComposer
  showStatusText
  statusTextMap={{
    idle: "待输入",
    generating: "正在生成..."
  }}
/>
```

固定文案：

```tsx
<AiComposer
  showStatusText
  statusText="正在处理"
/>
```

### 右侧提示文案配置

默认不展示发送按钮左侧提示文案。

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `actionHint` | `ReactNode` / `string` | `undefined` | 发送按钮左侧提示文案。 |

React 示例：

```tsx
<AiComposer actionHint="预计 10 秒" />
```

Vue 示例：

```ts
h(AiComposer, {
  actionHint: "预计 10 秒"
});
```

### Stop 按钮配置

默认不展示 Stop。

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `showStopButton` | `boolean` | `false` | 生成中是否展示 Stop。 |
| `onStop` | `() => void` | `undefined` | 点击 Stop 回调。 |

默认行为：

```text
点击发送
发送按钮置灰
等待 onSend Promise 返回
发送按钮恢复
```

开启 Stop：

```tsx
<AiComposer
  showStopButton
  onStop={() => {
    console.log("stop");
  }}
/>
```

### Mention 和 Command 配置

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mentions` | `MentionItem[]` | `[]` | `@` 候选项。 |
| `commands` | `CommandItem[]` | `[]` | `/` 候选项。 |
| `onMentionSelect` | `(item) => void` | `undefined` | 选择 mention 回调。 |
| `onCommandSelect` | `(item) => void` | `undefined` | 选择 command 回调。 |

示例：

```tsx
<AiComposer
  mentions={[
    {
      id: "designer",
      label: "@designer",
      value: "@designer",
      description: "设计助手"
    }
  ]}
  commands={[
    {
      id: "summarize",
      label: "/summarize",
      value: "/summarize",
      description: "总结内容"
    }
  ]}
/>
```

## 8. AiComposer 事件入参

| 事件 | 入参 | 说明 |
| --- | --- | --- |
| `onChange` | `(value: string) => void` | 输入内容变化。 |
| `onSend` | `(value: string, context: { attachments: ComposerAttachment[] }) => void \| Promise<void>` | 点击发送或 Enter 发送。 |
| `onStop` | `() => void` | 点击 Stop。 |
| `onAttachmentsChange` | `(attachments: ComposerAttachment[]) => void` | 附件列表变化。 |
| `onAttachmentError` | `(message: string, file?: File) => void` | 上传校验失败。 |
| `onActionOptionChange` | `(id: string, value: string) => void` | 底部配置项变化。 |
| `onMentionSelect` | `(item: MentionItem) => void` | 选择 `@` 候选项。 |
| `onCommandSelect` | `(item: CommandItem) => void` | 选择 `/` 命令。 |

`onSend` 示例：

```tsx
<AiComposer
  onSend={async (value, context) => {
    console.log("输入内容", value);
    console.log("上传图片", context.attachments);

    await fetch("/api/generate-image", {
      method: "POST",
      body: JSON.stringify({
        prompt: value,
        attachments: context.attachments
      })
    });
  }}
/>
```

## 9. 图片交互能力

AiComposer 已内置图片交互：

```text
上传图片
图片堆叠展示
hover 图片上移并放大 1.2 倍
图片名称展示在图片上方
展开状态每张图片都有删除按钮
hover/选中图片时展示删除按钮
删除按钮半透明，点击区域已扩大
点击图片打开大图预览
大图预览限制在弹窗内，不会撑出图片框
```

## 10. ConversationView 配置

```tsx
<ConversationView messages={messages} />
```

`messages` 示例：

```ts
const messages = [
  {
    id: "1",
    role: "user",
    content: "生成一张二手车主图"
  },
  {
    id: "2",
    role: "assistant",
    content: "已生成图片",
    attachments: [
      {
        id: "image-1",
        type: "image/png",
        name: "car-main.png",
        url: "https://example.com/car-main.png"
      }
    ]
  }
];
```

支持：

```text
user / assistant / system
文本消息
图片消息
附件消息
streaming 状态
error 状态
empty 状态
基础 markdown 展示
```

## 11. WorkflowTimeline 配置

```tsx
import { WorkflowTimeline } from "@company/ai-studio-sdk/react";

<WorkflowTimeline
  steps={[
    {
      id: "1",
      title: "理解需求",
      status: "success",
      prompt: "分析用户输入"
    },
    {
      id: "2",
      title: "生成图片",
      status: "running",
      prompt: "调用图片模型"
    }
  ]}
/>
```

支持状态：

```text
waiting
running
success
error
```

## 12. Core SDK 入口

```ts
import {
  createAiStudio,
  SchemaValidator,
  WorkspaceFactory,
  PluginManager
} from "@company/ai-studio-sdk";
```

也可以使用 core 子入口：

```ts
import { createAiStudio } from "@company/ai-studio-sdk/core";
```

## 13. React Provider

```tsx
import {
  AiStudioProvider,
  useAiStudio
} from "@company/ai-studio-sdk/react";

function App() {
  return (
    <AiStudioProvider>
      <Page />
    </AiStudioProvider>
  );
}
```

## 14. Vue Provider

```ts
import {
  AiStudioProvider,
  useAiStudio
} from "@company/ai-studio-sdk/vue";
```

## 15. 二手车创意生图接入建议

推荐只替换通用输入和消息展示部分：

```text
保留：
现有页面布局
现有业务接口
现有业务状态
现有图片生成逻辑

替换：
输入框区域 -> AiComposer
消息区 -> ConversationView
流程展示 -> WorkflowTimeline，可选
```

最小接入方式：

```tsx
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
        { label: "1:1 主图", value: "1:1" }
      ]
    }
  ]}
  actionHint="预计 10 秒"
  onSend={async (prompt, context) => {
    await generateCarCreativeImage({
      prompt,
      images: context.attachments
    });
  }}
/>
```

## 16. 常见问题

### 样式没有生效

确认业务入口已引入：

```ts
import "@company/ai-studio-sdk/styles.css";
```

### 安装后仍是旧版本

先卸载再安装：

```bash
pnpm remove @company/ai-studio-sdk
pnpm add ./company-ai-studio-sdk-0.1.1.tgz
```

### 默认为什么没有 Stop

当前默认交互是发送后等待接口返回，发送按钮置灰。需要中断能力时显式开启：

```tsx
<AiComposer showStopButton />
```

### 状态文案为什么不显示

默认不显示。需要时开启：

```tsx
<AiComposer showStatusText statusTextMap={{ generating: "正在生成..." }} />
```
