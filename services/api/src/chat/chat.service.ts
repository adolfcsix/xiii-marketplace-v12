import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../auth/user.schema';
import { Order, SubOrder } from '../orders/order.schema';
import { Product } from '../products/product.schema';
import { Shop } from '../shops/shop.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimePublisher } from '../notifications/realtime-publisher.service';
import { ListConversationsDto, ListMessagesDto, SendMessageDto, StartConversationDto } from './chat.dto';
import { ChatMessage, Conversation } from './chat.schema';
import { ShopAccessService } from '../access-control/shop-access.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private readonly conversations: Model<Conversation>,
    @InjectModel(ChatMessage.name) private readonly messages: Model<ChatMessage>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    @InjectModel(Product.name) private readonly products: Model<Product>,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(SubOrder.name) private readonly subOrders: Model<SubOrder>,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimePublisher,
    private readonly shopAccess: ShopAccessService,
  ) {}

  private oid(id: string) { if (!Types.ObjectId.isValid(id)) throw new BadRequestException('INVALID_ID'); return new Types.ObjectId(id); }
  private page(dto: {page?:number;limit?:number}) { return { page: dto.page || 1, limit: dto.limit || 30 }; }

  async startBuyerConversation(userId: string, dto: StartConversationDto) {
    const buyerId = this.oid(userId); const shopId = this.oid(dto.shopId);
    const shop = await this.shops.findOne({ _id: shopId, status: 'ACTIVE' }).lean<any>();
    if (!shop) throw new NotFoundException('SHOP_NOT_FOUND');
    if (shop.ownerId.toString() === userId) throw new ForbiddenException('CANNOT_CHAT_WITH_OWN_SHOP');
    let productId: Types.ObjectId | undefined; let orderId: Types.ObjectId | undefined;
    if (dto.productId) {
      productId = this.oid(dto.productId);
      const product = await this.products.findOne({ _id: productId, shopId }).select({ _id: 1 }).lean<any>();
      if (!product) throw new NotFoundException('PRODUCT_NOT_IN_SHOP');
    }
    if (dto.orderCode) {
      const order = await this.orders.findOne({ orderCode: dto.orderCode, buyerId }).select({ _id: 1 }).lean<any>();
      if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
      const sub = await this.subOrders.findOne({ orderId: order._id, shopId }).select({ _id: 1 }).lean<any>();
      if (!sub) throw new NotFoundException('SHOP_NOT_IN_ORDER');
      orderId = order._id;
    }
    const $set: Record<string, unknown> = { sellerId: shop.ownerId, status: 'ACTIVE' };
    if (productId) $set.productId = productId;
    if (orderId) $set.orderId = orderId;
    const row = await this.conversations.findOneAndUpdate(
      { buyerId, shopId }, { $set, $setOnInsert: { lastMessage: '', lastMessageAt: new Date(), buyerUnread: 0, sellerUnread: 0 } }, { new: true, upsert: true },
    ).lean<any>();
    return this.decorateConversation(row, 'BUYER');
  }

  async listBuyer(userId: string, dto: ListConversationsDto) { return this.listForActor(this.oid(userId), 'BUYER', dto); }
  async listSeller(userId: string, dto: ListConversationsDto) { const access=await this.shopAccess.resolve(userId,true); return this.listForShop(access.shopId, dto); }

  private async listForActor(actorId: Types.ObjectId, role: 'BUYER'|'SELLER', dto: ListConversationsDto) {
    const { page, limit } = this.page(dto); const filter = role === 'BUYER' ? { buyerId: actorId } : { sellerId: actorId };
    const [rows, total] = await Promise.all([
      this.conversations.find(filter).sort({ lastMessageAt: -1 }).skip((page - 1) * limit).limit(limit).lean<any[]>(),
      this.conversations.countDocuments(filter),
    ]);
    return { items: await Promise.all(rows.map(row => this.decorateConversation(row, role))), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  private async listForShop(shopId: Types.ObjectId, dto: ListConversationsDto) {
    const { page, limit } = this.page(dto); const filter = { shopId };
    const [rows,total]=await Promise.all([this.conversations.find(filter).sort({lastMessageAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.conversations.countDocuments(filter)]);
    return { items: await Promise.all(rows.map(row=>this.decorateConversation(row,'SELLER'))), meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))} };
  }

  async unreadCountBuyer(userId: string) { const buyerId = this.oid(userId); const rows = await this.conversations.aggregate([{ $match: { buyerId } }, { $group: { _id: null, unreadCount: { $sum: '$buyerUnread' } } }]); return { unreadCount: rows[0]?.unreadCount || 0 }; }
  async unreadCountSeller(userId: string) { const access=await this.shopAccess.resolve(userId,true); const rows = await this.conversations.aggregate([{ $match: { shopId: access.shopId } }, { $group: { _id: null, unreadCount: { $sum: '$sellerUnread' } } }]); return { unreadCount: rows[0]?.unreadCount || 0 }; }

  async messagesBuyer(userId: string, id: string, dto: ListMessagesDto) { return this.messagesForActor(userId, id, 'BUYER', dto); }
  async messagesSeller(userId: string, id: string, dto: ListMessagesDto) { return this.messagesForActor(userId, id, 'SELLER', dto); }

  private async messagesForActor(userId: string, id: string, role: 'BUYER'|'SELLER', dto: ListMessagesDto) {
    const conv = await this.assertAccess(userId, id, role); const { page, limit } = this.page(dto);
    const [rows, total] = await Promise.all([
      this.messages.find({ conversationId: conv._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<any[]>(),
      this.messages.countDocuments({ conversationId: conv._id }),
    ]);
    return { conversation: await this.decorateConversation(conv, role), items: rows.reverse().map(row => this.serializeMessage(row)), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async sendBuyer(userId: string, id: string, dto: SendMessageDto) { return this.send(userId, id, 'BUYER', dto); }
  async sendSeller(userId: string, id: string, dto: SendMessageDto) { return this.send(userId, id, 'SELLER', dto); }

  async send(userId: string, id: string, role: 'BUYER'|'SELLER', dto: SendMessageDto) {
    const conv = await this.assertAccess(userId, id, role);
    const text = (dto.text || '').trim(); const attachments = dto.attachments || [];
    if (!text && !attachments.length) throw new BadRequestException('EMPTY_MESSAGE');
    if (text.length > 2000) throw new BadRequestException('MESSAGE_TOO_LONG');
    if (attachments.length > 4) throw new BadRequestException('TOO_MANY_ATTACHMENTS');
    let productId: Types.ObjectId | undefined; let orderId: Types.ObjectId | undefined;
    if (dto.productId) {
      productId = this.oid(dto.productId);
      const product = await this.products.findOne({ _id: productId, shopId: conv.shopId }).select({ _id: 1 }).lean<any>();
      if (!product) throw new NotFoundException('PRODUCT_NOT_IN_SHOP');
    }
    if (dto.orderCode) {
      const order = await this.orders.findOne({ orderCode: dto.orderCode, buyerId: conv.buyerId }).select({ _id: 1 }).lean<any>();
      if (!order) throw new NotFoundException('ORDER_NOT_FOUND'); orderId = order._id;
    }
    const row = await this.messages.create({
      conversationId: conv._id, senderId: this.oid(userId), senderRole: role, type: dto.type || (productId ? 'PRODUCT' : orderId ? 'ORDER' : 'TEXT'),
      text, attachments, productId, orderId, readAt: null,
    });
    const preview = text || (productId ? 'Đã gửi một sản phẩm' : orderId ? 'Đã gửi một đơn hàng' : 'Đã gửi tệp đính kèm');
    const inc = role === 'BUYER' ? { sellerUnread: 1 } : { buyerUnread: 1 };
    await this.conversations.updateOne({ _id: conv._id }, { $set: { lastMessage: preview.slice(0, 180), lastMessageAt: new Date(), ...(productId ? { productId } : {}), ...(orderId ? { orderId } : {}) }, $inc: inc });
    const message = this.serializeMessage(row.toObject());
    this.realtime.emitConversation(conv._id.toString(), 'chat:message', message);
    const targetId = role === 'BUYER' ? conv.sellerId.toString() : conv.buyerId.toString();
    const senderName = role === 'BUYER' ? 'Khách hàng' : 'Shop';
    await this.notifications.create({ userId: targetId, type: 'CHAT_MESSAGE', title: `${senderName} vừa nhắn tin`, body: preview.slice(0, 180), data: { conversationId: conv._id.toString(), shopId: conv.shopId.toString(), actorRole: role } });
    const unread = role === 'BUYER' ? await this.unreadCountSeller(targetId) : await this.unreadCountBuyer(targetId);
    this.realtime.emitUser(targetId, 'chat:unread', unread);
    return message;
  }

  async markReadBuyer(userId: string, id: string) { return this.markRead(userId, id, 'BUYER'); }
  async markReadSeller(userId: string, id: string) { return this.markRead(userId, id, 'SELLER'); }
  async markRead(userId: string, id: string, role: 'BUYER'|'SELLER') {
    const conv = await this.assertAccess(userId, id, role); const now = new Date();
    const opposite = role === 'BUYER' ? 'SELLER' : 'BUYER'; const unreadField = role === 'BUYER' ? 'buyerUnread' : 'sellerUnread';
    await Promise.all([
      this.conversations.updateOne({ _id: conv._id }, { $set: { [unreadField]: 0 } }),
      this.messages.updateMany({ conversationId: conv._id, senderRole: opposite, readAt: null }, { $set: { readAt: now } }),
    ]);
    const payload = { conversationId: conv._id.toString(), readerId: userId, readerRole: role, readAt: now };
    this.realtime.emitConversation(conv._id.toString(), 'chat:read', payload);
    const unread = role === 'BUYER' ? await this.unreadCountBuyer(userId) : await this.unreadCountSeller(userId);
    this.realtime.emitUser(userId, 'chat:unread', unread);
    return payload;
  }

  async authorizeSocket(userId: string, conversationId: string, role: 'BUYER'|'SELLER') { const conv = await this.assertAccess(userId, conversationId, role); return { conversationId: conv._id.toString() }; }

  private async assertAccess(userId: string, id: string, role: 'BUYER'|'SELLER') {
    const _id = this.oid(id); const actorId = this.oid(userId);
    const filter:any = role === 'BUYER' ? { _id, buyerId: actorId } : { _id, shopId: (await this.shopAccess.resolve(userId,true)).shopId };
    const conv = await this.conversations.findOne(filter).lean<any>(); if (!conv) throw new ForbiddenException('CHAT_ACCESS_DENIED'); return conv;
  }

  private async decorateConversation(row: any, role: 'BUYER'|'SELLER') {
    const [shop, buyer, product, order, subOrder] = await Promise.all([
      this.shops.findById(row.shopId).select({ name: 1, slug: 1, logo: 1, verified: 1 }).lean<any>(),
      this.users.findById(row.buyerId).select({ fullName: 1, avatar: 1 }).lean<any>(),
      row.productId ? this.products.findById(row.productId).select({ name: 1, slug: 1, images: 1 }).lean<any>() : null,
      row.orderId ? this.orders.findById(row.orderId).select({ orderCode: 1, status: 1 }).lean<any>() : null,
      row.orderId ? this.subOrders.findOne({ orderId: row.orderId, shopId: row.shopId }).select({ subOrderCode: 1, status: 1 }).lean<any>() : null,
    ]);
    return {
      ...row, _id: row._id.toString(), buyerId: row.buyerId.toString(), shopId: row.shopId.toString(), sellerId: row.sellerId.toString(),
      unreadCount: role === 'BUYER' ? row.buyerUnread || 0 : row.sellerUnread || 0,
      shop: shop ? { ...shop, _id: shop._id.toString() } : null,
      buyer: buyer ? { ...buyer, _id: buyer._id.toString() } : null,
      product: product ? { ...product, _id: product._id.toString() } : null,
      order: order ? { ...order, _id: order._id.toString(), subOrderCode: subOrder?.subOrderCode || '', subOrderStatus: subOrder?.status || '' } : null,
    };
  }

  private serializeMessage(row: any) { return { ...row, _id: row._id.toString(), conversationId: row.conversationId.toString(), senderId: row.senderId.toString(), productId: row.productId?.toString?.(), orderId: row.orderId?.toString?.() }; }
}
