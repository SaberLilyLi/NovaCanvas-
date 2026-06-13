import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString } from 'class-validator';
import { DataService } from '../data/data.service.js';
import { StorageService } from '../storage/storage.service.js';

class UploadContextDto {
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

@Controller('upload')
export class UploadController {
  constructor(
    private readonly storage: StorageService,
    private readonly data: DataService,
  ) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_request, file, callback) =>
        callback(
          file.mimetype.startsWith('image/') ? null : new BadRequestException('仅支持图片文件'),
          file.mimetype.startsWith('image/'),
        ),
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Body() context: UploadContextDto) {
    if (!file) throw new BadRequestException('请选择图片');
    const userId = await this.data.ensureUser(context.userId);
    const stored = await this.storage.save(file.buffer, {
      originalName: file.originalname,
      contentType: file.mimetype,
    });
    const image = await this.data.createImage({
      userId,
      conversationId: context.conversationId,
      url: stored.url,
      storageKey: stored.storageKey,
      type: 'uploaded',
      name: file.originalname,
    });
    return { imageId: image.id, url: image.url, image };
  }
}
