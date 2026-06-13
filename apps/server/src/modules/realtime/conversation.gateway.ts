import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { NovaCanvasSocketEvent } from '@novacanvas/types';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/conversation',
  path: '/ws',
  cors: { origin: true, credentials: true },
})
export class ConversationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  handleConnection(@ConnectedSocket() client: Socket) {
    const conversationId = String(client.handshake.query.conversationId ?? '');
    if (!conversationId) {
      client.disconnect(true);
      return;
    }
    void client.join(this.room(conversationId));
  }

  emitTaskEvent(conversationId: string, event: NovaCanvasSocketEvent) {
    this.server.to(this.room(conversationId)).emit('task_event', event);
  }

  private room(conversationId: string) {
    return `conversation:${conversationId}`;
  }
}
