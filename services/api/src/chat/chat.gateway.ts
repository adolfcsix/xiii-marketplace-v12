import { UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../auth/user.schema';
import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimePublisher } from '../notifications/realtime-publisher.service';
import { ChatService } from './chat.service';

@WebSocketGateway({ namespace: '/realtime', cors: { origin: true, credentials: true } })
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  constructor(private readonly jwt: JwtService, private readonly chat: ChatService, private readonly realtime: RealtimePublisher,
    @InjectModel(User.name) private readonly users: Model<User>) {}

  private async authenticate(client: Socket) {
    const token = client.data.accessToken;
    const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET || 'dev-access' });
    if (!Types.ObjectId.isValid(payload.sub) || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new Error('INVALID_TOKEN');
    const user = await this.users.findById(payload.sub).select({ status: 1, roles: 1 }).lean();
    if (!user || user.status !== 'ACTIVE') throw new Error('ACCOUNT_NOT_ACTIVE');
    client.data.user = { sub: String(payload.sub), roles: user.roles || ['BUYER'] };
    return payload;
  }

  private async requireUser(client: Socket) {
    try { await this.authenticate(client); return client.data.user; }
    catch { client.disconnect(true); throw new Error('AUTH_REQUIRED'); }
  }

  handleDisconnect(client: Socket) {
    clearTimeout(client.data.expiryTimer);
    delete client.data.user;
  }

  afterInit(server: Server) { this.realtime.attach(server); }

  async handleConnection(client: Socket) {
    try {
      const raw = String(client.handshake.auth?.token || client.handshake.headers.authorization || '');
      const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
      if (!token) throw new Error('MISSING_TOKEN');
      client.data.accessToken = token;
      const payload = await this.authenticate(client);
      client.data.expiryTimer = setTimeout(() => client.disconnect(true), Math.min(2147483647, payload.exp * 1000 - Date.now()));
      client.data.expiryTimer.unref?.();
      await client.join(`user:${payload.sub}`);
      client.emit('realtime:ready', { userId: String(payload.sub) });
    } catch { client.disconnect(true); }
  }

  @SubscribeMessage('chat:join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string; actorRole: 'BUYER'|'SELLER' }) {
    try {
      const user = await this.requireUser(client);
      if (!['BUYER','SELLER'].includes(body.actorRole)) throw new Error('INVALID_ROLE');
      if (body.actorRole === 'SELLER' && !user.roles?.some((r: string) => ['SELLER','ADMIN','SUPER_ADMIN'].includes(r))) throw new Error('INSUFFICIENT_ROLE');
      await this.chat.authorizeSocket(user.sub, body.conversationId, body.actorRole);
      await client.join(`conversation:${body.conversationId}`);
      await this.chat.markRead(user.sub, body.conversationId, body.actorRole);
      return { ok: true, conversationId: body.conversationId };
    } catch (error) { throw new WsException(error instanceof Error ? error.message : 'CHAT_JOIN_FAILED'); }
  }

  @SubscribeMessage('chat:send')
  async send(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string; actorRole: 'BUYER'|'SELLER'; text?: string; attachments?: string[]; type?: string; productId?: string; orderCode?: string }) {
    try {
      const user = await this.requireUser(client);
      if (!['BUYER','SELLER'].includes(body.actorRole)) throw new Error('INVALID_ROLE');
      if (body.actorRole === 'SELLER' && !user.roles?.some((r: string) => ['SELLER','ADMIN','SUPER_ADMIN'].includes(r))) throw new Error('INSUFFICIENT_ROLE');
      return await this.chat.send(user.sub, body.conversationId, body.actorRole, { text: body.text, attachments: body.attachments, type: body.type as any, productId: body.productId, orderCode: body.orderCode });
    } catch (error) { throw new WsException(error instanceof Error ? error.message : 'CHAT_SEND_FAILED'); }
  }

  @SubscribeMessage('chat:read')
  async read(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string; actorRole: 'BUYER'|'SELLER' }) {
    try {
      const user = await this.requireUser(client);
      if (!['BUYER','SELLER'].includes(body.actorRole)) throw new Error('INVALID_ROLE');
      if (body.actorRole === 'SELLER' && !user.roles?.some((r: string) => ['SELLER','ADMIN','SUPER_ADMIN'].includes(r))) throw new Error('INSUFFICIENT_ROLE');
      return await this.chat.markRead(user.sub, body.conversationId, body.actorRole);
    } catch (error) { throw new WsException(error instanceof Error ? error.message : 'CHAT_READ_FAILED'); }
  }
}
