import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './modules/health/health.controller.js';
import { DataModule } from './modules/data/data.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { ModelModule } from './modules/model/model.module.js';
import { ConversationModule } from './modules/conversation/conversation.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { GenerationModule } from './modules/generation/generation.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    DataModule,
    RealtimeModule,
    StorageModule,
    ModelModule,
    ConversationModule,
    UploadModule,
    GenerationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
