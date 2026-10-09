import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class RealtimePublisher {
  private server?: Server;

  attach(server: Server) { this.server = server; }
  emitUser(userId: string, event: string, payload: unknown) { this.server?.to(`user:${userId}`).emit(event, payload); }
  disconnectUser(userId: string) { this.server?.in(`user:${userId}`).disconnectSockets(true); }
  emitConversation(conversationId: string, event: string, payload: unknown) { this.server?.to(`conversation:${conversationId}`).emit(event, payload); }
}
