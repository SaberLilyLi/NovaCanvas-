import { Module } from '@nestjs/common';
import { GenerationController } from './generation.controller.js';
import { GenerationService } from './generation.service.js';

@Module({
  controllers: [GenerationController],
  providers: [GenerationService],
})
export class GenerationModule {}
