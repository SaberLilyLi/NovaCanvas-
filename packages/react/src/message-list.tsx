import { useMemo } from 'react';
import { Download, MoreHorizontal, RefreshCw, Sparkles } from 'lucide-react';
import { getBizConfig } from '@novacanvas/biz-config';
import type {
  BizType,
  ConversationMessage,
  GeneratedImage,
  ImageSize,
} from '@novacanvas/types';

export interface MessageListProps {
  bizType: BizType;
  sceneType: string;
  messages: ConversationMessage[];
  images: GeneratedImage[];
  ratio: string;
  ratioToSize: (ratio: string) => ImageSize;
  enableImageEdit?: boolean;
  enableDownload?: boolean;
  onContinueEdit: (image: GeneratedImage) => void;
  onRegenerate: (image: GeneratedImage) => void;
  onQuickPrompt: (prompt: string) => void;
}

type ConversationItem =
  | { type: 'message'; message: ConversationMessage }
  | { type: 'images'; id: string; images: GeneratedImage[]; resultGroupId?: string };

function buildConversationItems(
  messages: ConversationMessage[],
  images: GeneratedImage[],
): ConversationItem[] {
  const items: ConversationItem[] = [];
  const shownGroups = new Set<string>();

  for (const message of messages) {
    if (message.role === 'assistant' && message.content.includes('已拆分为')) {
      continue;
    }

    if (message.role === 'assistant' && message.imageIds?.length) {
      const firstImage = images.find((item) => item.id === message.imageIds?.[0]);
      const groupId =
        message.resultGroupId ?? firstImage?.resultGroupId ?? `legacy-${message.id}`;
      if (shownGroups.has(groupId)) continue;
      shownGroups.add(groupId);

      const groupImages = images
        .filter(
          (item) =>
            (item.resultGroupId && item.resultGroupId === groupId) ||
            message.imageIds!.includes(item.id),
        )
        .sort((a, b) => (a.imageIndex ?? 0) - (b.imageIndex ?? 0));

      if (groupImages.length > 0) {
        items.push({
          type: 'images',
          id: groupId,
          images: groupImages,
          resultGroupId: firstImage?.resultGroupId ?? message.resultGroupId,
        });
      }
      continue;
    }

    items.push({ type: 'message', message });
  }

  return items;
}

export function MessageList(props: MessageListProps) {
  const config = getBizConfig(props.bizType);
  const conversationItems = useMemo(
    () => buildConversationItems(props.messages, props.images),
    [props.messages, props.images],
  );

  if (props.messages.length === 0 && props.images.length === 0) {
    return (
      <div className="nova-composer__welcome">
        <div className="nova-composer__welcome-icon">
          <Sparkles size={26} />
        </div>
        <h2>{config.title}</h2>
        <p>
          {config.supportedSceneTypes.find((item) => item.value === props.sceneType)?.promptHint}
        </p>
        <div className="nova-composer__quick-prompts">
          {config.quickPrompts.map((item) => (
            <button key={item} type="button" onClick={() => props.onQuickPrompt(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="nova-composer__messages">
      {conversationItems.map((item) =>
        item.type === 'message' ? (
          <div
            className={`nova-composer__message nova-composer__message--${item.message.role}`}
            key={item.message.id}
          >
            {item.message.role === 'user' ? (
              <>
                <p>{item.message.content}</p>
                <span>你</span>
              </>
            ) : (
              <p>{item.message.content}</p>
            )}
          </div>
        ) : (
          <section className="nova-composer__result-block" key={item.id}>
            <div className="nova-composer__result-meta">
              <span>图片生成</span>
              <small>
                GPT Image 2 · {props.ratioToSize(props.ratio)} · {item.images.length} 张
              </small>
            </div>
            <div
              className={`nova-composer__gallery nova-composer__gallery--conversation ${
                item.images.length === 1 ? 'is-single' : ''
              }`}
            >
              {item.images.map((image) => (
                <article key={image.id}>
                  {item.images.length > 1 && (
                    <span className="nova-composer__image-index">第 {image.imageIndex ?? '?'} 张</span>
                  )}
                  <img src={image.url} alt={`AI generated result ${image.imageIndex ?? ''}`} />
                </article>
              ))}
            </div>
            <div className="nova-composer__result-actions">
              {props.enableImageEdit !== false &&
                item.images.map((image) => (
                  <button
                    key={`edit-${image.id}`}
                    type="button"
                    onClick={() => props.onContinueEdit(image)}
                  >
                    <Sparkles size={15} />
                    继续编辑{image.imageIndex ? ` #${image.imageIndex}` : ''}
                  </button>
                ))}
              {item.images.map((image) => (
                <button
                  key={`regen-${image.id}`}
                  type="button"
                  onClick={() => props.onRegenerate(image)}
                >
                  <RefreshCw size={15} />
                  重新生成{image.imageIndex ? ` #${image.imageIndex}` : ''}
                </button>
              ))}
              {props.enableDownload !== false &&
                item.images.map((image) => (
                  <a key={`dl-${image.id}`} href={image.url} download target="_blank" rel="noreferrer">
                    <Download size={15} />
                  </a>
                ))}
              <button type="button" aria-label="更多操作">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </section>
        ),
      )}
    </div>
  );
}
