import { Global, Module } from '@nestjs/common';
import { ConversationGateway } from './conversation.gateway.js';

@Global()
@Module({
  providers: [ConversationGateway],
  exports: [ConversationGateway],
})
export class RealtimeModule {}
