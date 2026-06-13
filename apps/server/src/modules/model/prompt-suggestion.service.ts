import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  buildImagePrompt,
  DEEPSEEK_PROMPT_SUGGESTIONS_SYSTEM_PROMPT,
  DEEPSEEK_REGENERATE_SYSTEM_PROMPT,
} from '@novacanvas/prompt-presets';
import type { BizType, ConversationMessage, PromptSuggestion } from '@novacanvas/types';

export interface RegenerateContextInput {
  bizType: BizType;
  sceneType?: string;
  lastUserPrompt: string;
  messages?: ConversationMessage[];
}

export interface RegenerateContextResult {
  lastUserPrompt: string;
  variedPrompt: string;
  suggestions: PromptSuggestion[];
}

export interface PromptSuggestionsInput {
  bizType: BizType;
  sceneType?: string;
  lastUserPrompt: string;
}

export interface PromptSuggestionsResult {
  suggestions: PromptSuggestion[];
}

const variationHints = [
  '采用不同构图与镜头距离',
  '换成另一种光线氛围',
  '尝试不同艺术风格',
  '调整背景环境细节',
  '改变主体姿态与表情',
];

@Injectable()
export class PromptSuggestionService {
  async createPromptSuggestions(
    input: PromptSuggestionsInput,
  ): Promise<PromptSuggestionsResult> {
    const lastUserPrompt = input.lastUserPrompt.trim();
    if (!lastUserPrompt) {
      throw new ServiceUnavailableException('缺少可用于生成建议的用户提示词');
    }

    if ((process.env.NOVACANVAS_RUNTIME ?? 'mock') === 'live') {
      return this.createLivePromptSuggestions(input);
    }

    return {
      suggestions: this.buildFallbackSuggestions(lastUserPrompt),
    };
  }

  async createRegenerateContext(
    input: RegenerateContextInput,
  ): Promise<RegenerateContextResult> {
    const lastUserPrompt = input.lastUserPrompt.trim();
    if (!lastUserPrompt) {
      throw new ServiceUnavailableException('缺少可用于重新生成的用户提示词');
    }

    if ((process.env.NOVACANVAS_RUNTIME ?? 'mock') === 'mock') {
      return this.createMockRegenerateContext(input);
    }

    return this.createLiveRegenerateContext(input);
  }

  private createMockRegenerateContext(
    input: RegenerateContextInput,
  ): RegenerateContextResult {
    const hint = variationHints[Math.floor(Math.random() * variationHints.length)];
    const variedPrompt = buildImagePrompt({
      bizType: input.bizType,
      sceneType: input.sceneType,
      userPrompt: `${input.lastUserPrompt}，${hint}，生成一张新的独立画面`,
      history: input.messages,
    });

    return {
      lastUserPrompt: input.lastUserPrompt,
      variedPrompt,
      suggestions: this.buildFallbackSuggestions(input.lastUserPrompt),
    };
  }

  private async createLivePromptSuggestions(
    input: PromptSuggestionsInput,
  ): Promise<PromptSuggestionsResult> {
    const parsed = await this.requestDeepSeekSuggestions(
      DEEPSEEK_PROMPT_SUGGESTIONS_SYSTEM_PROMPT,
      {
        bizType: input.bizType,
        sceneType: input.sceneType,
        lastUserPrompt: input.lastUserPrompt,
      },
    );

    return {
      suggestions: this.normalizeSuggestions(input.lastUserPrompt, parsed.suggestions),
    };
  }

  private async createLiveRegenerateContext(
    input: RegenerateContextInput,
  ): Promise<RegenerateContextResult> {
    const parsed = await this.requestDeepSeekSuggestions(
      DEEPSEEK_REGENERATE_SYSTEM_PROMPT,
      {
        bizType: input.bizType,
        sceneType: input.sceneType,
        lastUserPrompt: input.lastUserPrompt,
        variationHint: variationHints[Math.floor(Math.random() * variationHints.length)],
      },
    );

    const variedUserPrompt = parsed.variedPrompt?.trim() || input.lastUserPrompt;

    return {
      lastUserPrompt: input.lastUserPrompt,
      variedPrompt: buildImagePrompt({
        bizType: input.bizType,
        sceneType: input.sceneType,
        userPrompt: variedUserPrompt,
        history: input.messages,
      }),
      suggestions: this.normalizeSuggestions(input.lastUserPrompt, parsed.suggestions),
    };
  }

  private async requestDeepSeekSuggestions(
    systemPrompt: string,
    userPayload: Record<string, unknown>,
  ): Promise<{
    variedPrompt?: string;
    suggestions?: Array<{ title?: string; prompt?: string } | string>;
  }> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('缺少 DEEPSEEK_API_KEY');

    const response = await fetch(
      `${(process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
          response_format: { type: 'json_object' },
          temperature: 0.85,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(userPayload) },
          ],
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(
        `DeepSeek 文案生成失败 (${response.status}): ${detail.slice(0, 240)}`,
      );
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new ServiceUnavailableException('DeepSeek 未返回文案');
    }

    return JSON.parse(content) as {
      variedPrompt?: string;
      suggestions?: Array<{ title?: string; prompt?: string } | string>;
    };
  }

  private normalizeSuggestions(
    lastUserPrompt: string,
    rawSuggestions?: Array<{ title?: string; prompt?: string } | string>,
  ): PromptSuggestion[] {
    const normalized = (rawSuggestions ?? [])
      .map((item) => this.normalizeSuggestionItem(lastUserPrompt, item))
      .filter((item): item is PromptSuggestion => Boolean(item));

    if (normalized.length >= 3) {
      return normalized.slice(0, 3);
    }

    return this.buildFallbackSuggestions(lastUserPrompt, normalized);
  }

  private normalizeSuggestionItem(
    lastUserPrompt: string,
    item: { title?: string; prompt?: string } | string,
  ): PromptSuggestion | null {
    if (typeof item === 'string') {
      const prompt = item.trim();
      if (!prompt) return null;
      return {
        title: this.buildTitleFromPrompt(prompt),
        prompt,
      };
    }

    const title = item.title?.trim();
    const prompt = item.prompt?.trim();
    if (!title || !prompt) return null;

    return { title, prompt };
  }

  private buildTitleFromPrompt(prompt: string): string {
    const compact = prompt.replace(/\s+/g, '');
    if (compact.length <= 18) return compact;
    return `${compact.slice(0, 16)}…`;
  }

  private buildFallbackSuggestions(
    lastUserPrompt: string,
    existing: PromptSuggestion[] = [],
  ): PromptSuggestion[] {
    const defaults: PromptSuggestion[] = [
      {
        title: '尝试另一种风格',
        prompt: `${lastUserPrompt}，采用不同艺术风格，细节丰富，光影自然，清晰对焦，无文字、无水印、无Logo、无边框`,
      },
      {
        title: '加上更具氛围感的背景',
        prompt: `${lastUserPrompt}，背景换成更具氛围感的环境，层次丰富，色调协调，清晰对焦，无文字、无水印、无Logo、无边框`,
      },
      {
        title: '换一种构图方式',
        prompt: `${lastUserPrompt}，采用不同构图与镜头距离，主体突出，画面干净，清晰对焦，无文字、无水印、无Logo、无边框`,
      },
    ];

    const merged = [...existing];
    for (const item of defaults) {
      if (merged.length >= 3) break;
      if (!merged.some((entry) => entry.title === item.title)) {
        merged.push(item);
      }
    }

    return merged.slice(0, 3);
  }
}
