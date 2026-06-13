import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { BizType, ImageSize, TaskType } from '@novacanvas/types';
import {
  capImageSize,
  normalizeImageSize,
  parseImageResolutionCap,
  resolveImageDimensions,
} from '@novacanvas/types';

interface GenerateImageInput {
  prompt: string;
  size: ImageSize;
  bizType: BizType;
  model?: string;
  referenceUrls: string[];
  taskType?: TaskType;
}

const escapeXml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const DOUBAO_IMAGE_MODEL_ALIASES: Record<string, string> = {
  'doubao-seedream-3-0': 'doubao-seedream-3-0-250415',
  'doubao-seedream-3.0': 'doubao-seedream-3-0-250415',
  'doubao-seedream-4-0': 'doubao-seedream-4-0-250828',
  'doubao-seedream-4.0': 'doubao-seedream-4-0-250828',
  'doubao-seedream-4-5': 'doubao-seedream-4-5-251128',
  'doubao-seedream-4.5': 'doubao-seedream-4-5-251128',
  'doubao-seedream-4-7': 'doubao-seedream-4-7-250923',
  'doubao-seedream-4.7': 'doubao-seedream-4-7-250923',
};

@Injectable()
export class ImageModelService {
  async generate(input: GenerateImageInput): Promise<{ data: Buffer; extension: string }> {
    if (
      (input.taskType === 'image_to_image' || input.taskType === 'text_image_to_image') &&
      input.referenceUrls.length === 0
    ) {
      throw new BadRequestException(
        `${input.taskType} requires at least one reference image and cannot fallback to text_to_image`,
      );
    }

    if ((process.env.NOVACANVAS_RUNTIME ?? 'mock') === 'live') {
      return this.generateWithProvider(input);
    }

    return this.generateMock(input);
  }

  private generateMock(input: GenerateImageInput) {
    const { width, height } = resolveImageDimensions(normalizeImageSize(input.size));
    const palette =
      input.bizType === 'used_car'
        ? ['#0a1118', '#127c86', '#dfe8e7']
        : input.bizType === 'fashion'
          ? ['#171716', '#b83d54', '#f2e9dd']
          : ['#11181c', '#287d72', '#f0eee8'];
    const lines = input.prompt
      .replace(/\s+/g, ' ')
      .match(/.{1,30}/g)
      ?.slice(0, 4) ?? ['NovaCanvas AI'];
    const lineSvg = lines
      .map(
        (line, index) =>
          `<text x="72" y="${height - 220 + index * 42}" fill="${palette[2]}" font-family="Arial, sans-serif" font-size="28">${escapeXml(line)}</text>`,
      )
      .join('');
    const subject =
      input.bizType === 'used_car'
        ? `<path d="M190 590 C250 450 380 390 650 410 L835 535 L900 590 Z" fill="${palette[1]}" opacity=".92"/><circle cx="330" cy="595" r="72" fill="#080b0d" stroke="${palette[2]}" stroke-width="12"/><circle cx="760" cy="595" r="72" fill="#080b0d" stroke="${palette[2]}" stroke-width="12"/>`
        : input.bizType === 'fashion'
          ? `<path d="M420 245 L510 180 L602 245 L690 380 L620 430 L595 760 L425 760 L400 430 L330 380 Z" fill="${palette[1]}"/><path d="M510 180 L510 760" stroke="${palette[2]}" stroke-width="8" opacity=".65"/>`
          : `<circle cx="512" cy="455" r="235" fill="${palette[1]}"/><rect x="330" y="330" width="364" height="250" rx="16" fill="${palette[2]}" opacity=".82"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="#263038"/></linearGradient></defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <path d="M0 ${Math.round(height * 0.69)} C${Math.round(width * 0.22)} ${Math.round(height * 0.61)} ${Math.round(width * 0.42)} ${Math.round(height * 0.77)} ${width} ${Math.round(height * 0.6)} L${width} ${height} L0 ${height} Z" fill="#ffffff" opacity=".06"/>
      ${subject}
      <text x="72" y="100" fill="${palette[2]}" font-family="Arial, sans-serif" font-size="32" font-weight="700">NOVACANVAS / ${input.bizType.toUpperCase()}</text>
      ${lineSvg}
    </svg>`;
    return Promise.resolve({ data: Buffer.from(svg), extension: '.svg' });
  }

  private async generateWithProvider(input: GenerateImageInput) {
    const selectedModel = this.resolveGenerationModel(input.model);

    if (selectedModel.provider === 'doubao-seedream') {
      return this.generateWithDoubaoSeedream(input, selectedModel.model);
    }

    return this.generateWithGptImage(input, selectedModel.model);
  }

  private resolveGenerationModel(requestedModel?: string) {
    const normalized = requestedModel?.trim();
    const defaultModel = (process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2').trim();

    if (!normalized) {
      return {
        provider: 'openai' as const,
        model: defaultModel,
      };
    }

    if (/doubao|seedream/i.test(normalized)) {
      const resolvedModel =
        DOUBAO_IMAGE_MODEL_ALIASES[normalized.toLowerCase()] ?? normalized;

      return {
        provider: 'doubao-seedream' as const,
        model: resolvedModel,
      };
    }

    return {
      provider: 'openai' as const,
      model: normalized,
    };
  }

  private async generateWithGptImage(input: GenerateImageInput, model: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('Missing OPENAI_API_KEY');

    const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    const maxResolution = parseImageResolutionCap(process.env.OPENAI_IMAGE_MAX_RESOLUTION ?? '2k');
    const size = capImageSize(normalizeImageSize(input.size), maxResolution);
    let response: Response;

    if (input.referenceUrls.length) {
      const form = new FormData();
      form.append('model', model);
      form.append('prompt', input.prompt);
      form.append('size', size);
      form.append('quality', 'high');
      form.append('output_format', 'png');
      form.append('response_format', 'url');
      for (const [index, url] of input.referenceUrls.slice(0, 1).entries()) {
        const imageResponse = await fetch(url);
        if (!imageResponse.ok) continue;
        form.append('image', await imageResponse.blob(), `reference-${index}.png`);
      }
      response = await fetch(`${baseUrl}/images/edits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } else {
      response = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: input.prompt,
          size,
          quality: 'high',
          output_format: 'png',
          response_format: 'url',
          n: 1,
        }),
      });
    }

    if (!response.ok) {
      const message = await response.text();
      throw new ServiceUnavailableException(`GPT Image generation failed: ${message.slice(0, 300)}`);
    }

    const body = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const result = body.data?.[0];
    if (result?.b64_json) {
      return { data: Buffer.from(result.b64_json, 'base64'), extension: '.png' };
    }
    if (result?.url) {
      const imageResponse = await fetch(result.url);
      return { data: Buffer.from(await imageResponse.arrayBuffer()), extension: '.png' };
    }

    throw new ServiceUnavailableException('GPT Image generation returned no image data');
  }

  private async generateWithDoubaoSeedream(input: GenerateImageInput, model: string) {
    const apiKey = process.env.DOUBAO_API_KEY ?? process.env.ARK_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('Missing DOUBAO_API_KEY or ARK_API_KEY');

    const baseUrl = (
      process.env.DOUBAO_BASE_URL ??
      process.env.ARK_BASE_URL ??
      'https://ark.cn-beijing.volces.com/api/v3'
    ).replace(/\/$/, '');
    const maxResolution = parseImageResolutionCap(process.env.DOUBAO_IMAGE_MAX_RESOLUTION ?? '2k');
    const size = capImageSize(normalizeImageSize(input.size), maxResolution);

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        size,
        watermark: false,
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new ServiceUnavailableException(`Doubao Seedream generation failed: ${message.slice(0, 300)}`);
    }

    const body = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const result = body.data?.[0];

    if (result?.b64_json) {
      return { data: Buffer.from(result.b64_json, 'base64'), extension: '.png' };
    }

    if (result?.url) {
      const imageResponse = await fetch(result.url);
      if (!imageResponse.ok) {
        throw new ServiceUnavailableException('Doubao Seedream returned an unreadable image URL');
      }
      return { data: Buffer.from(await imageResponse.arrayBuffer()), extension: '.png' };
    }

    throw new ServiceUnavailableException('Doubao Seedream returned no image data');
  }
}
