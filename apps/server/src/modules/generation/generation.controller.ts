import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { BizType, ImageSize } from '@novacanvas/types';
import { GenerationService } from './generation.service.js';
import { IsImageSize } from './is-image-size.validator.js';

class CreateGenerationDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsIn(['general', 'used_car', 'fashion', 'ecommerce', 'poster'])
  bizType!: BizType;

  @IsOptional()
  @IsString()
  sceneType?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageIds?: string[];

  @IsOptional()
  @IsString()
  selectedImageId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  count?: number;

  @IsOptional()
  @IsImageSize()
  size?: ImageSize;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  regenerateFromPrompt?: string;
}

class PromptSuggestionsDto {
  @IsIn(['general', 'used_car', 'fashion', 'ecommerce', 'poster'])
  bizType!: BizType;

  @IsOptional()
  @IsString()
  sceneType?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsString()
  lastUserPrompt!: string;
}

@Controller('generation')
export class GenerationController {
  constructor(private readonly generation: GenerationService) {}

  @Post('create')
  create(@Body() input: CreateGenerationDto) {
    return this.generation.create(input);
  }

  @Post('prompt-suggestions')
  createPromptSuggestions(@Body() input: PromptSuggestionsDto) {
    return this.generation.createPromptSuggestions(input);
  }

  @Get('task/:taskId')
  getTask(@Param('taskId') taskId: string) {
    return this.generation.getTask(taskId);
  }

  @Post('task/:taskId/retry')
  retry(@Param('taskId') taskId: string) {
    return this.generation.retry(taskId);
  }

  @Post('task/:taskId/cancel')
  cancel(@Param('taskId') taskId: string) {
    return this.generation.cancel(taskId);
  }
}
