import { Controller, Get, Param } from '@nestjs/common';
import { DataService } from '../data/data.service.js';

@Controller('conversation')
export class ConversationController {
  constructor(private readonly data: DataService) {}

  @Get(':conversationId')
  getConversation(@Param('conversationId') conversationId: string) {
    return this.data.getConversation(conversationId);
  }
}
