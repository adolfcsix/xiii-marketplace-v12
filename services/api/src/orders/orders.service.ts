import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { InventoryTransaction } from '../inventory/inventory-transaction.schema';
import { Inventory } from '../inventory/inventory.schema';
import { Payment } from '../payments/payment.schema';
import { Shop } from '../shops/shop.schema';
import { Voucher, VoucherUsage } from '../vouchers/voucher.schema';
import { CancelOrderDto, ListAdminOrdersDto, ListOrdersDto, ListSellerOrdersDto, SellerUpdateOrderStatusDto } from './orders.dto';
import { Order, OrderItem, OrderStatusHistory, SubOrder } from './order.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { FinanceService } from '../finance/finance.service';
import { ShopAccessService } from '../access-control/shop-access.service';
import { User } from '../auth/user.schema';

const BUYER_CANCELLABLE = ['PENDING_PAYMENT', 'CONFIRMED'];
const SELLER_TRANSITIONS: Record<string, string> = { PAID: 'CONFIRMED', CONFIRMED: 'PACKING', PACKING: 'READY_TO_SHIP', READY_TO_SHIP: 'SHIPPED', SHIPPED: 'DELIVERED' };
const FULFILMENT_PROGRESS = ['PENDING_PAYMENT','PAID','CONFIRMED','PACKING','READY_TO_SHIP','SHIPPED','DELIVERED','COMPLETED'];

@Injectable()
export class OrdersService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(SubOrder.name) private readonly subOrders: Model<SubOrder>,
    @InjectModel(OrderItem.name) private readonly orderItems: Model<OrderItem>,
    @InjectModel(OrderStatusHistory.name) private readonly history: Model<OrderStatusHistory>,
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    @InjectModel(Inventory.name) private readonly inventories: Model<Inventory>,
    @InjectModel(InventoryTransaction.name) private readonly inventoryTransactions: Model<InventoryTransaction>,
    @InjectModel(Voucher.name) private readonly vouchers: Model<Voucher>,
    @InjectModel(VoucherUsage.name) private readonly voucherUsages: Model<VoucherUsage>,
    @InjectModel(Payment.name) private readonly payments: Model<Payment>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly notifications: NotificationsService,
    private readonly finance: FinanceService,
    private readonly shopAccess: ShopAccessService,
  ) {}

  private objectId(id: string) { return new Types.ObjectId(id); }

  async listForBuyer(userId: string, dto: ListOrdersDto) {
    const buyerId = this.objectId(userId);
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const filter: Record<string, any> = { buyerId };
    if (dto.status) filter.status = dto.status;

    const [rows, total, statusRows] = await Promise.all([
      this.orders.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<any[]>(),
      this.orders.countDocuments(filter),
      this.orders.aggregate([{ $match: { buyerId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const orderIds = rows.map(row => row._id);
    const [subs, items] = orderIds.length ? await Promise.all([
      this.subOrders.find({ orderId: { $in: orderIds } }).lean<any[]>(),
      this.orderItems.find({ orderId: { $in: orderIds } }).sort({ createdAt: 1 }).lean<any[]>(),
    ]) : [[], []];
    const shopIds = [...new Set(subs.map(sub => sub.shopId.toString()))].map(id => this.objectId(id));
    const shops = shopIds.length ? await this.shops.find({ _id: { $in: shopIds } }).select({ name: 1, slug: 1, verified: 1 }).lean<any[]>() : [];
    const shopMap = new Map<string, any>(shops.map(shop => [shop._id.toString(), shop] as const));
    const byOrderSubs = new Map<string, any[]>();
    const byOrderItems = new Map<string, any[]>();
    for (const sub of subs) {
      const key = sub.orderId.toString();
      byOrderSubs.set(key, [...(byOrderSubs.get(key) ?? []), sub]);
    }
    for (const item of items) {
      const key = item.orderId.toString();
      byOrderItems.set(key, [...(byOrderItems.get(key) ?? []), item]);
    }

    return {
      items: rows.map(row => {
        const key = row._id.toString();
        const orderSubs = byOrderSubs.get(key) ?? [];
        const orderItems = byOrderItems.get(key) ?? [];
        return {
          ...row,
          _id: key,
          subOrderCount: orderSubs.length,
          itemCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
          shops: orderSubs.map(sub => {
            const shop = shopMap.get(sub.shopId.toString());
            return { _id: sub.shopId.toString(), name: shop?.name || 'Shop', slug: shop?.slug || '', verified: Boolean(shop?.verified) };
          }),
          previewItems: orderItems.slice(0, 4).map(item => ({
            _id: item._id.toString(), productName: item.productName, image: item.image, quantity: item.quantity,
            totalPrice: item.totalPrice, variantSnapshot: item.variantSnapshot,
          })),
          canCancel: BUYER_CANCELLABLE.includes(row.status),
          canConfirmReceived: row.status === 'DELIVERED',
        };
      }),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      statusCounts: Object.fromEntries(statusRows.map((row: any) => [row._id, row.count])),
    };
  }

  async getForBuyer(userId: string, orderCode: string) {
    const order = await this.orders.findOne({ orderCode, buyerId: this.objectId(userId) }).lean<any>();
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    const [subs, items, history, payment] = await Promise.all([
      this.subOrders.find({ orderId: order._id }).sort({ createdAt: 1 }).lean<any[]>(),
      this.orderItems.find({ orderId: order._id }).sort({ createdAt: 1 }).lean<any[]>(),
      this.history.find({ orderId: order._id }).sort({ createdAt: 1 }).lean<any[]>(),
      this.payments.findOne({ orderId: order._id }).sort({ createdAt: -1 }).select({ paymentCode: 1, provider: 1, status: 1, amount: 1, providerTransactionId: 1, providerResponseCode: 1, expiresAt: 1, paidAt: 1, createdAt: 1 }).lean<any>(),
    ]);
    const shopIds = [...new Set(subs.map(sub => sub.shopId.toString()))].map(id => this.objectId(id));
    const shops = shopIds.length ? await this.shops.find({ _id: { $in: shopIds } }).lean<any[]>() : [];
    const shopMap = new Map<string, any>(shops.map(shop => [shop._id.toString(), shop] as const));
    return {
      ...order,
      _id: order._id.toString(),
      canCancel: BUYER_CANCELLABLE.includes(order.status),
      canConfirmReceived: order.status === 'DELIVERED',
      canPay: order.status === 'PENDING_PAYMENT' && ['MOMO', 'VNPAY'].includes(order.paymentMethod) && ['PENDING', 'PROCESSING'].includes(order.paymentStatus),
      shipping: { method: order.shippingMethod, address: order.shippingAddress },
      payment: payment ? { ...payment, _id: payment._id?.toString?.() } : null,
      timeline: history.map(row => ({
        _id: row._id.toString(), subOrderId: row.subOrderId?.toString?.() || null, fromStatus: row.fromStatus || null,
        toStatus: row.toStatus, note: row.note, changedBy: row.changedBy?.toString?.(), createdAt: row.createdAt,
      })),
      subOrders: subs.map(sub => ({
        ...sub,
        _id: sub._id.toString(),
        shop: shopMap.get(sub.shopId.toString()) ? {
          _id: sub.shopId.toString(), name: shopMap.get(sub.shopId.toString()).name,
          slug: shopMap.get(sub.shopId.toString()).slug, verified: shopMap.get(sub.shopId.toString()).verified,
        } : null,
        items: items.filter(item => item.subOrderId.toString() === sub._id.toString()).map(item => ({ ...item, _id: item._id.toString() })),
      })),
    };
  }


  private nextSellerStatus(status: string) { return SELLER_TRANSITIONS[status] || null; }

  private deriveMasterStatus(subs: any[], fallback: string) {
    if (!subs.length) return fallback;
    if (subs.every(sub => sub.status === 'CANCELLED')) return 'CANCELLED';
    const active = subs.filter(sub => sub.status !== 'CANCELLED');
    if (!active.length) return 'CANCELLED';
    const ranked = active.map(sub => FULFILMENT_PROGRESS.indexOf(sub.status)).filter(rank => rank >= 0);
    if (ranked.length !== active.length) return fallback;
    return FULFILMENT_PROGRESS[Math.min(...ranked)];
  }

  private async syncMasterStatus(orderId: Types.ObjectId, changedBy: Types.ObjectId, session: ClientSession) {
    const [order, subs] = await Promise.all([
      this.orders.findById(orderId).session(session).lean<any>(),
      this.subOrders.find({ orderId }).session(session).lean<any[]>(),
    ]);
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    const next = this.deriveMasterStatus(subs, order.status);
    if (next !== order.status) {
      await this.orders.updateOne({ _id: orderId, status: order.status }, { $set: { status: next } }, { session });
      await this.history.create([{
        orderId,
        fromStatus: order.status,
        toStatus: next,
        changedBy,
        note: 'Master order status synchronized from seller fulfilment',
      }], { session });
    }
    return next;
  }

  async listForSeller(userId: string, dto: ListSellerOrdersDto) {
    const access = await this.shopAccess.resolve(userId, true);
    const shopId = access.shopId;
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const filter: Record<string, any> = { shopId };
    if (dto.status) filter.status = dto.status;
    const [subs, total, statusRows] = await Promise.all([
      this.subOrders.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<any[]>(),
      this.subOrders.countDocuments(filter),
      this.subOrders.aggregate([{ $match: { shopId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const orderIds = [...new Set(subs.map(sub => sub.orderId.toString()))].map(id => this.objectId(id));
    const subIds = subs.map(sub => sub._id);
    const shopIds = [...new Set(subs.map(sub => sub.shopId.toString()))].map(id => this.objectId(id));
    const [orders, items, shops] = await Promise.all([
      orderIds.length ? this.orders.find({ _id: { $in: orderIds } }).lean<any[]>() : [],
      subIds.length ? this.orderItems.find({ subOrderId: { $in: subIds } }).sort({ createdAt: 1 }).lean<any[]>() : [],
      shopIds.length ? this.shops.find({ _id: { $in: shopIds } }).select({ name: 1, slug: 1, verified: 1 }).lean<any[]>() : [],
    ]);
    const orderMap = new Map<string, any>(orders.map(order => [order._id.toString(), order] as const));
    const shopMap = new Map<string, any>(shops.map(shop => [shop._id.toString(), shop] as const));
    const itemsBySub = new Map<string, any[]>();
    for (const item of items) {
      const key = item.subOrderId.toString();
      itemsBySub.set(key, [...(itemsBySub.get(key) ?? []), item]);
    }
    return {
      items: subs.map(sub => {
        const order = orderMap.get(sub.orderId.toString());
        const shop = shopMap.get(sub.shopId.toString());
        const subItems = itemsBySub.get(sub._id.toString()) ?? [];
        return {
          ...sub,
          _id: sub._id.toString(),
          orderCode: order?.orderCode,
          paymentMethod: order?.paymentMethod,
          paymentStatus: order?.paymentStatus,
          shippingMethod: order?.shippingMethod,
          recipient: order?.shippingAddress ? {
            name: order.shippingAddress.recipientName,
            phone: order.shippingAddress.phone,
            province: order.shippingAddress.province,
            district: order.shippingAddress.district,
          } : null,
          shop: shop ? { _id: shop._id.toString(), name: shop.name, slug: shop.slug, verified: Boolean(shop.verified) } : null,
          itemCount: subItems.reduce((sum, item) => sum + item.quantity, 0),
          previewItems: subItems.slice(0, 3).map(item => ({
            _id: item._id.toString(), productName: item.productName, image: item.image, quantity: item.quantity,
            totalPrice: item.totalPrice, variantSnapshot: item.variantSnapshot,
          })),
          nextStatus: this.nextSellerStatus(sub.status),
        };
      }),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      statusCounts: Object.fromEntries(statusRows.map((row: any) => [row._id, row.count])),
    };
  }

  async getForSeller(userId: string, subOrderCode: string) {
    const access = await this.shopAccess.resolve(userId, true);
    const sub = await this.subOrders.findOne({ subOrderCode, shopId: access.shopId }).lean<any>();
    if (!sub) throw new NotFoundException('SELLER_ORDER_NOT_FOUND');
    const [order, items, timeline, shop] = await Promise.all([
      this.orders.findById(sub.orderId).lean<any>(),
      this.orderItems.find({ subOrderId: sub._id }).sort({ createdAt: 1 }).lean<any[]>(),
      this.history.find({ subOrderId: sub._id }).sort({ createdAt: 1 }).lean<any[]>(),
      this.shops.findById(sub.shopId).select({ name: 1, slug: 1, logo: 1, verified: 1 }).lean<any>(),
    ]);
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    return {
      ...sub,
      _id: sub._id.toString(),
      order: {
        orderCode: order.orderCode,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        shippingMethod: order.shippingMethod,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
      },
      shop: shop ? { ...shop, _id: shop._id.toString() } : null,
      items: items.map(item => ({ ...item, _id: item._id.toString() })),
      timeline: timeline.map(row => ({ ...row, _id: row._id.toString(), changedBy: row.changedBy?.toString?.() })),
      nextStatus: this.nextSellerStatus(sub.status),
    };
  }

  async sellerSummary(userId: string) {
    const access = await this.shopAccess.resolve(userId, true);
    const shopId = access.shopId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [statusRows, todayRows, recent] = await Promise.all([
      this.subOrders.aggregate([{ $match: { shopId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.subOrders.aggregate([
        { $match: { shopId, createdAt: { $gte: today }, status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$sellerRevenue' } } },
      ]),
      this.subOrders.find({ shopId }).sort({ createdAt: -1 }).limit(5).lean<any[]>(),
    ]);
    const counts = Object.fromEntries(statusRows.map((row: any) => [row._id, row.count]));
    const todayResult = todayRows[0] || { orders: 0, revenue: 0 };
    const orderIds = recent.map(sub => sub.orderId);
    const orders = orderIds.length ? await this.orders.find({ _id: { $in: orderIds } }).select({ orderCode: 1, paymentMethod: 1, paymentStatus: 1 }).lean<any[]>() : [];
    const orderMap = new Map<string, any>(orders.map(order => [order._id.toString(), order] as const));
    return {
      todayOrders: todayResult.orders,
      todayRevenue: todayResult.revenue,
      needsAction: (counts.PAID || 0) + (counts.CONFIRMED || 0) + (counts.PACKING || 0) + (counts.READY_TO_SHIP || 0),
      shippingNow: counts.SHIPPED || 0,
      statusCounts: counts,
      recent: recent.map(sub => ({
        _id: sub._id.toString(), subOrderCode: sub.subOrderCode, status: sub.status, subtotal: sub.subtotal,
        sellerRevenue: sub.sellerRevenue, createdAt: sub.createdAt, nextStatus: this.nextSellerStatus(sub.status),
        orderCode: orderMap.get(sub.orderId.toString())?.orderCode,
      })),
    };
  }

  async updateSellerStatus(userId: string, subOrderCode: string, dto: SellerUpdateOrderStatusDto) {
    const session = await this.connection.startSession();
    let notifyBuyerId = ''; let notifyOrderCode = '';
    try {
      let response: any;
      await session.withTransaction(async () => {
        const access = await this.shopAccess.resolve(userId, true);
        const actorId = this.objectId(userId);
        const sub = await this.subOrders.findOne({ subOrderCode, shopId: access.shopId }).session(session).lean<any>();
        if (!sub) throw new NotFoundException('SELLER_ORDER_NOT_FOUND');
        const expected = this.nextSellerStatus(sub.status);
        if (!expected || dto.status !== expected) throw new ConflictException('INVALID_SELLER_ORDER_TRANSITION');
        const order = await this.orders.findById(sub.orderId).session(session).lean<any>();
        if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
        notifyBuyerId = order.buyerId.toString(); notifyOrderCode = order.orderCode;
        if (sub.status === 'PAID' && order.paymentStatus !== 'SUCCESS') throw new ConflictException('PAYMENT_NOT_VERIFIED');

        const now = new Date();
        const set: Record<string, any> = { status: dto.status };
        if (dto.status === 'CONFIRMED') set.confirmedAt = now;
        if (dto.status === 'PACKING') set.packingAt = now;
        if (dto.status === 'READY_TO_SHIP') set.readyToShipAt = now;
        if (dto.status === 'SHIPPED') {
          const trackingCode = (dto.trackingCode || sub.trackingCode || '').trim();
          if (!trackingCode) throw new ConflictException('TRACKING_CODE_REQUIRED');
          set.trackingCode = trackingCode;
          set.shippingProvider = dto.shippingProvider || sub.shippingProvider || 'OTHER';
          set.shippedAt = now;
        }
        if (dto.status === 'DELIVERED') set.deliveredAt = now;

        const update = await this.subOrders.updateOne({ _id: sub._id, shopId: access.shopId, status: sub.status }, { $set: set }, { session });
        if (update.modifiedCount !== 1) throw new ConflictException('SELLER_ORDER_CONCURRENT_UPDATE');
        const note = (dto.note || `Seller moved ${sub.subOrderCode} to ${dto.status}`).trim();
        await this.history.create([{
          orderId: sub.orderId,
          subOrderId: sub._id,
          fromStatus: sub.status,
          toStatus: dto.status,
          changedBy: actorId,
          note,
        }], { session });
        const masterStatus = await this.syncMasterStatus(sub.orderId, actorId, session);
        response = {
          subOrderCode: sub.subOrderCode,
          status: dto.status,
          masterStatus,
          trackingCode: set.trackingCode || sub.trackingCode || '',
          shippingProvider: set.shippingProvider || sub.shippingProvider || '',
          nextStatus: this.nextSellerStatus(dto.status),
        };
      });
      if (notifyBuyerId) await this.notifications.createSafe({ userId: notifyBuyerId, type: 'ORDER_STATUS', title: 'Đơn hàng vừa cập nhật', body: `${notifyOrderCode} → ${response.status}`, data: { orderCode: notifyOrderCode, subOrderCode, status: response.status } });
      return response;
    } finally { await session.endSession(); }
  }

  private async restoreVoucher(orderId: Types.ObjectId, session: ClientSession) {
    const usages = await this.voucherUsages.find({ orderId }).session(session).lean<any[]>();
    if (!usages.length) return;
    await this.voucherUsages.deleteMany({ orderId }, { session });
    for (const usage of usages) {
      await this.vouchers.updateOne({ _id: usage.voucherId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
    }
  }

  async cancelForBuyer(userId: string, orderCode: string, dto: CancelOrderDto) {
    const session = await this.connection.startSession();
    const notifySellerIds: string[] = [];
    try {
      let response: any;
      await session.withTransaction(async () => {
        const order = await this.orders.findOne({ orderCode, buyerId: this.objectId(userId) }).session(session).lean<any>();
        if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
        if (!BUYER_CANCELLABLE.includes(order.status)) throw new ConflictException('ORDER_CANNOT_BE_CANCELLED');

        const items = await this.orderItems.find({ orderId: order._id }).session(session).lean<any[]>();
        for (const item of items) {
          const inventory = await this.inventories.findOneAndUpdate(
            { variantId: item.variantId, reserved: { $gte: item.quantity } },
            { $inc: { available: item.quantity, reserved: -item.quantity } },
            { session, new: true },
          ).lean<any>();
          if (!inventory) throw new ConflictException('INVENTORY_RELEASE_FAILED');
          await this.inventoryTransactions.create([{
            shopId: item.shopId, variantId: item.variantId, type: 'RELEASE', quantity: item.quantity,
            referenceType: 'ORDER', referenceId: order._id,
            beforeQuantity: inventory.available - item.quantity, afterQuantity: inventory.available,
            createdBy: this.objectId(userId), note: `Buyer cancelled ${order.orderCode}`,
          }], { session });
        }

        await this.restoreVoucher(order._id, session);
        await this.payments.updateMany(
          { orderId: order._id, status: { $in: ['PENDING', 'PROCESSING'] } },
          { $set: { status: 'CANCELLED', providerResponseCode: 'BUYER_CANCELLED' } },
          { session },
        );
        const reason = (dto.reason || 'Người mua hủy đơn').trim();
        await this.orders.updateOne(
          { _id: order._id, status: order.status },
          { $set: { status: 'CANCELLED', paymentStatus: 'CANCELLED', cancelReason: reason, cancelledAt: new Date() } },
          { session },
        );
        const subs = await this.subOrders.find({ orderId: order._id }).session(session).lean<any[]>();
        notifySellerIds.push(...Array.from(new Set(subs.map(sub => sub.sellerId.toString()))));
        await this.subOrders.updateMany({ orderId: order._id, status: { $ne: 'CANCELLED' } }, { $set: { status: 'CANCELLED' } }, { session });
        await this.history.create([{
          orderId: order._id, fromStatus: order.status, toStatus: 'CANCELLED', changedBy: this.objectId(userId), note: reason,
        }, ...subs.map(sub => ({
          orderId: order._id, subOrderId: sub._id, fromStatus: sub.status, toStatus: 'CANCELLED', changedBy: this.objectId(userId), note: reason,
        }))], { session, ordered: true });
        response = { orderCode: order.orderCode, status: 'CANCELLED', paymentStatus: 'CANCELLED', releasedItemCount: items.reduce((n, item) => n + item.quantity, 0) };
      });
      for (const sellerId of notifySellerIds) await this.notifications.createSafe({ userId: sellerId, type: 'ORDER_STATUS', title: 'Buyer đã hủy đơn', body: `${orderCode} đã bị người mua hủy.`, data: { orderCode, status: 'CANCELLED' } });
      return response;
    } finally { await session.endSession(); }
  }

  async confirmReceived(userId: string, orderCode: string) {
    const session = await this.connection.startSession();
    const notifySellerIds: string[] = [];
    try {
      let response: any;
      await session.withTransaction(async () => {
        const order = await this.orders.findOne({ orderCode, buyerId: this.objectId(userId) }).session(session).lean<any>();
        if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
        if (order.status !== 'DELIVERED') throw new ConflictException('ORDER_NOT_DELIVERED');
        const items = await this.orderItems.find({ orderId: order._id }).session(session).lean<any[]>();
        for (const item of items) {
          const inventory = await this.inventories.findOneAndUpdate(
            { variantId: item.variantId, reserved: { $gte: item.quantity } },
            { $inc: { reserved: -item.quantity, sold: item.quantity } },
            { session, new: true },
          ).lean<any>();
          if (!inventory) throw new ConflictException('INVENTORY_FINALIZE_FAILED');
          await this.inventoryTransactions.create([{
            shopId: item.shopId, variantId: item.variantId, type: 'SALE', quantity: item.quantity,
            referenceType: 'ORDER', referenceId: order._id,
            beforeQuantity: inventory.reserved + item.quantity, afterQuantity: inventory.reserved,
            createdBy: this.objectId(userId), note: `Buyer confirmed receipt ${order.orderCode}`,
          }], { session });
        }
        await this.orders.updateOne(
          { _id: order._id, status: 'DELIVERED' },
          { $set: { status: 'COMPLETED', completedAt: new Date(), ...(order.paymentMethod === 'COD' ? { paymentStatus: 'SUCCESS' } : {}) } },
          { session },
        );
        const subs = await this.subOrders.find({ orderId: order._id }).session(session).lean<any[]>();
        notifySellerIds.push(...Array.from(new Set(subs.map(sub => sub.sellerId.toString()))));
        await this.subOrders.updateMany({ orderId: order._id, status: 'DELIVERED' }, { $set: { status: 'COMPLETED' } }, { session });
        await this.finance.recordCompletedSubOrders(order, subs.filter(sub => sub.status === 'DELIVERED'), session);
        await this.history.create([{
          orderId: order._id, fromStatus: 'DELIVERED', toStatus: 'COMPLETED', changedBy: this.objectId(userId), note: 'Buyer confirmed receipt',
        }, ...subs.filter(sub => sub.status === 'DELIVERED').map(sub => ({
          orderId: order._id, subOrderId: sub._id, fromStatus: 'DELIVERED', toStatus: 'COMPLETED', changedBy: this.objectId(userId), note: 'Buyer confirmed receipt',
        }))], { session, ordered: true });
        response = { orderCode: order.orderCode, status: 'COMPLETED', paymentStatus: order.paymentMethod === 'COD' ? 'SUCCESS' : order.paymentStatus };
      });
      for (const sellerId of notifySellerIds) await this.notifications.createSafe({ userId: sellerId, type: 'ORDER_STATUS', title: 'Đơn hàng đã hoàn tất', body: `Buyer đã xác nhận nhận ${orderCode}.`, data: { orderCode, status: 'COMPLETED' } });
      return response;
    } finally { await session.endSession(); }
  }
  async listForAdmin(dto: ListAdminOrdersDto) {
    const page=dto.page||1,limit=dto.limit||20; const filter:any={};
    if(dto.status)filter.status=dto.status; if(dto.paymentStatus)filter.paymentStatus=dto.paymentStatus; if(dto.paymentMethod)filter.paymentMethod=dto.paymentMethod;
    if(dto.search?.trim()){const q=dto.search.trim(); const rx=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'); filter.$or=[{orderCode:rx},{voucherCode:rx}];}
    const [rows,total,statusRows,paymentRows]=await Promise.all([
      this.orders.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.orders.countDocuments(filter),
      this.orders.aggregate([{ $group:{_id:'$status',count:{$sum:1}} }]),this.orders.aggregate([{ $group:{_id:'$paymentStatus',count:{$sum:1}} }])
    ]);
    const ids=rows.map(x=>x._id),buyerIds=[...new Set(rows.map(x=>x.buyerId.toString()))].map(x=>this.objectId(x));
    const [subs,users]=await Promise.all([ids.length?this.subOrders.find({orderId:{$in:ids}}).lean<any[]>():[],buyerIds.length?this.users.find({_id:{$in:buyerIds}}).select({fullName:1,email:1,phone:1,status:1}).lean<any[]>():[]]);
    const um=new Map<string, any>(users.map(u=>[u._id.toString(),u] as const)); const subCount=new Map<string,number>(); for(const sub of subs)subCount.set(sub.orderId.toString(),(subCount.get(sub.orderId.toString())||0)+1);
    return {items:rows.map(o=>({...o,_id:o._id.toString(),buyer:{_id:o.buyerId.toString(),fullName:um.get(o.buyerId.toString())?.fullName||'Buyer',email:um.get(o.buyerId.toString())?.email||'',phone:um.get(o.buyerId.toString())?.phone||'',status:um.get(o.buyerId.toString())?.status||''},subOrderCount:subCount.get(o._id.toString())||0})),meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))},statusCounts:Object.fromEntries(statusRows.map((r:any)=>[r._id,r.count])),paymentCounts:Object.fromEntries(paymentRows.map((r:any)=>[r._id,r.count]))};
  }

  async getForAdmin(orderCode:string){
    const order=await this.orders.findOne({orderCode}).lean<any>(); if(!order)throw new NotFoundException('ORDER_NOT_FOUND');
    const [buyer,subs,items,history,payment]=await Promise.all([this.users.findById(order.buyerId).select({fullName:1,email:1,phone:1,status:1}).lean<any>(),this.subOrders.find({orderId:order._id}).sort({createdAt:1}).lean<any[]>(),this.orderItems.find({orderId:order._id}).sort({createdAt:1}).lean<any[]>(),this.history.find({orderId:order._id}).sort({createdAt:1}).lean<any[]>(),this.payments.findOne({orderId:order._id}).sort({createdAt:-1}).lean<any>()]);
    const shopIds=[...new Set(subs.map(s=>s.shopId.toString()))].map(x=>this.objectId(x)); const shops=shopIds.length?await this.shops.find({_id:{$in:shopIds}}).select({name:1,slug:1,status:1,verified:1}).lean<any[]>():[]; const sm=new Map(shops.map(x=>[x._id.toString(),x]));
    return {...order,_id:order._id.toString(),buyer:buyer?{...buyer,_id:buyer._id.toString()}:null,payment:payment?{...payment,_id:payment._id.toString()}:null,timeline:history.map(h=>({...h,_id:h._id.toString(),subOrderId:h.subOrderId?.toString?.()||null,changedBy:h.changedBy?.toString?.()})),subOrders:subs.map(sub=>({...sub,_id:sub._id.toString(),shop:sm.get(sub.shopId.toString())?{...sm.get(sub.shopId.toString()),_id:sub.shopId.toString()}:null,items:items.filter(i=>i.subOrderId.toString()===sub._id.toString()).map(i=>({...i,_id:i._id.toString()}))}))};
  }

}
