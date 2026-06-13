import { Module } from '@nestjs/common';
import { ConversationController } from './conversation.controller.js';

@Module({
  controllers: [ConversationController],
})
export class ConversationModule {}
