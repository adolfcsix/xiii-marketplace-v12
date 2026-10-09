import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Connection, Model, Types } from 'mongoose';
import { InventoryTransaction } from '../inventory/inventory-transaction.schema';
import { Inventory } from '../inventory/inventory.schema';
import { Order, OrderItem, OrderStatusHistory, SubOrder } from '../orders/order.schema';
import { Voucher, VoucherUsage } from '../vouchers/voucher.schema';
import { CreatePaymentDto } from './payment.dto';
import { Payment, PaymentEvent } from './payment.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';

const TERMINAL_PAYMENT_STATUSES = new Set(['SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED']);

type ProviderConfig = { configured: boolean; name: 'MOMO' | 'VNPAY' };

type FinalizeResult = 'UPDATED' | 'ALREADY_SUCCESS' | 'ALREADY_TERMINAL' | 'ORDER_NOT_PENDING';

@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private expiryTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Payment.name) private readonly payments: Model<Payment>,
    @InjectModel(PaymentEvent.name) private readonly events: Model<PaymentEvent>,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(SubOrder.name) private readonly subOrders: Model<SubOrder>,
    @InjectModel(OrderItem.name) private readonly orderItems: Model<OrderItem>,
    @InjectModel(OrderStatusHistory.name) private readonly orderHistory: Model<OrderStatusHistory>,
    @InjectModel(Inventory.name) private readonly inventories: Model<Inventory>,
    @InjectModel(InventoryTransaction.name) private readonly inventoryTransactions: Model<InventoryTransaction>,
    @InjectModel(Voucher.name) private readonly vouchers: Model<Voucher>,
    @InjectModel(VoucherUsage.name) private readonly voucherUsages: Model<VoucherUsage>,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  onModuleInit() {
    this.expiryTimer = setInterval(() => void this.expirePendingPayments(), 60_000);
    this.expiryTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
  }


  private webUrl() { return this.config.get('WEB_URL', 'http://localhost:3000').replace(/\/$/, ''); }
  private apiPublicUrl() { return this.config.get('API_PUBLIC_URL', 'http://localhost:4000').replace(/\/$/, ''); }

  private providerConfig(provider: 'MOMO' | 'VNPAY'): ProviderConfig {
    if (provider === 'MOMO') {
      return { name: 'MOMO', configured: Boolean(this.config.get('MOMO_PARTNER_CODE') && this.config.get('MOMO_ACCESS_KEY') && this.config.get('MOMO_SECRET_KEY')) };
    }
    return { name: 'VNPAY', configured: Boolean(this.config.get('VNPAY_TMN_CODE') && this.config.get('VNPAY_HASH_SECRET')) };
  }

  async getProviders() {
    const s=await this.settings.get();
    return {
      expiresMinutes: s.paymentExpiresMinutes,
      providers: [
        {...this.providerConfig('MOMO'),enabled:Boolean(s.momoEnabled)},
        {...this.providerConfig('VNPAY'),enabled:Boolean(s.vnpayEnabled)},
      ], codEnabled:Boolean(s.codEnabled), standardShippingFee:s.standardShippingFee, expressShippingFee:s.expressShippingFee,
    };
  }

  private code(prefix: string) {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private hmac(algorithm: 'sha256' | 'sha512', secret: string, data: string) {
    return createHmac(algorithm, secret).update(data, 'utf8').digest('hex');
  }

  private safeEqual(a: string, b: string) {
    try {
      const aa = Buffer.from(a.toLowerCase(), 'utf8');
      const bb = Buffer.from(b.toLowerCase(), 'utf8');
      return aa.length === bb.length && timingSafeEqual(aa, bb);
    } catch { return false; }
  }

  private dateVn(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).reduce<Record<string, string>>((acc, part) => { acc[part.type] = part.value; return acc; }, {});
    return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
  }

  private sortedQuery(params: Record<string, string | number | undefined>) {
    const pairs = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value)).replace(/%20/g, '+')}`);
    return pairs.join('&');
  }

  async create(userId: string, dto: CreatePaymentDto, ip = '127.0.0.1') {
    const provider = dto.provider;
    const marketplaceSettings=await this.settings.get(); const enabled=provider==='MOMO'?marketplaceSettings.momoEnabled:marketplaceSettings.vnpayEnabled; if(!enabled) throw new ConflictException(`${provider}_DISABLED`);
    if (!this.providerConfig(provider).configured) throw new ConflictException(`${provider}_NOT_CONFIGURED`);

    const order = await this.orders.findOne({ orderCode: dto.orderCode, buyerId: new Types.ObjectId(userId) }).lean<any>();
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    if (order.paymentMethod !== provider) throw new ConflictException('PAYMENT_METHOD_MISMATCH');
    if (order.status !== 'PENDING_PAYMENT' || !['PENDING', 'PROCESSING'].includes(order.paymentStatus)) throw new ConflictException('ORDER_NOT_PAYABLE');
    if (order.paymentExpiresAt && new Date(order.paymentExpiresAt).getTime() <= Date.now()) {
      await this.expireOrder(order._id.toString(), 'PAYMENT_TIMEOUT');
      throw new ConflictException('PAYMENT_EXPIRED');
    }

    const active = await this.payments.findOne({ orderId: order._id, provider, status: { $in: ['PENDING', 'PROCESSING'] }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).lean<any>();
    if (active?.payUrl) return this.toClient(active);

    let payment: any = active;
    if (!payment) {
      const paymentCode = this.code('PAY');
      const requestId = this.code('REQ');
      const expiresAt = order.paymentExpiresAt ? new Date(order.paymentExpiresAt) : new Date(Date.now() + Number(marketplaceSettings.paymentExpiresMinutes) * 60_000);
      const [created] = await this.payments.create([{
        paymentCode, orderId: order._id, orderCode: order.orderCode, buyerId: new Types.ObjectId(userId), provider,
        providerOrderId: paymentCode, requestId, amount: order.totalAmount, status: 'PENDING', expiresAt,
        metadata: { createdFrom: 'checkout' },
      }]);
      payment = created.toObject();
    }

    try {
      // Reusing the same payment/requestId is deliberate. If a MoMo create call timed out,
      // retrying the same idempotency key is safer than generating a second charge attempt.
      const gateway = provider === 'MOMO'
        ? await this.createMomo(payment, order)
        : await this.createVnpay(payment, order, ip);
      await this.payments.updateOne(
        { _id: payment._id, status: { $in: ['PENDING', 'PROCESSING'] } },
        { $set: { status: 'PROCESSING', ...gateway } },
      );
      await this.orders.updateOne({ _id: order._id, status: 'PENDING_PAYMENT' }, { $set: { paymentStatus: 'PROCESSING' } });
      const latest = await this.payments.findById(payment._id).lean<any>();
      return this.toClient(latest || { ...payment, status: 'PROCESSING', ...gateway });
    } catch (error) {
      const explicitProviderRejection = error instanceof BadGatewayException && String(error.message).startsWith('MOMO_CREATE_FAILED:');
      await this.payments.updateOne(
        { _id: payment._id, status: { $in: ['PENDING', 'PROCESSING'] } },
        { $set: { status: explicitProviderRejection ? 'FAILED' : 'PENDING', providerResponseCode: explicitProviderRejection ? 'CREATE_REJECTED' : 'CREATE_UNCERTAIN' } },
      );
      if (error instanceof ConflictException || error instanceof BadRequestException || error instanceof BadGatewayException) throw error;
      throw new BadGatewayException(error instanceof Error ? error.message : 'PAYMENT_PROVIDER_ERROR');
    }
  }

  private toClient(payment: any) {
    return {
      paymentCode: payment.paymentCode,
      orderCode: payment.orderCode,
      provider: payment.provider,
      amount: payment.amount,
      status: payment.status,
      payUrl: payment.payUrl || '',
      deeplink: payment.deeplink || '',
      qrCodeUrl: payment.qrCodeUrl || '',
      expiresAt: payment.expiresAt,
    };
  }

  private async createMomo(payment: any, order: any) {
    const partnerCode = this.config.get<string>('MOMO_PARTNER_CODE')!;
    const accessKey = this.config.get<string>('MOMO_ACCESS_KEY')!;
    const secretKey = this.config.get<string>('MOMO_SECRET_KEY')!;
    const endpoint = this.config.get('MOMO_ENDPOINT', 'https://test-payment.momo.vn/v2/gateway/api/create');
    const requestType = this.config.get('MOMO_REQUEST_TYPE', 'captureWallet');
    const redirectUrl = `${this.webUrl()}/payment-result?orderCode=${encodeURIComponent(order.orderCode)}&provider=MOMO`;
    const ipnUrl = `${this.apiPublicUrl()}/api/v1/payments/webhooks/momo`;
    const extraData = '';
    const orderInfo = `Thanh toan don hang ${order.orderCode}`;
    const raw = `accessKey=${accessKey}&amount=${payment.amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${payment.providerOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${payment.requestId}&requestType=${requestType}`;
    const body = {
      partnerCode, partnerName: 'XIII Marketplace', storeId: 'XIII', requestId: payment.requestId,
      amount: payment.amount, orderId: payment.providerOrderId, orderInfo, redirectUrl, ipnUrl,
      lang: 'vi', requestType, autoCapture: true, extraData,
      signature: this.hmac('sha256', secretKey, raw),
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
      const json = await response.json() as any;
      await this.events.create({ paymentId: payment._id, provider: 'MOMO', eventType: 'CREATE_RESPONSE', externalId: String(json.requestId || payment.requestId), verified: response.ok, payload: json });
      if (!response.ok || Number(json.resultCode) !== 0 || !json.payUrl) throw new BadGatewayException(`MOMO_CREATE_FAILED:${json.resultCode ?? response.status}`);
      return { payUrl: json.payUrl, deeplink: json.deeplink || '', qrCodeUrl: json.qrCodeUrl || '', providerResponseCode: String(json.resultCode) };
    } finally { clearTimeout(timeout); }
  }

  private async createVnpay(payment: any, order: any, ip: string) {
    const tmnCode = this.config.get<string>('VNPAY_TMN_CODE')!;
    const secret = this.config.get<string>('VNPAY_HASH_SECRET')!;
    const endpoint = this.config.get('VNPAY_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    const now = new Date();
    const expire = new Date(payment.expiresAt);
    const returnUrl = `${this.webUrl()}/payment-result?orderCode=${encodeURIComponent(order.orderCode)}&provider=VNPAY`;
    const params: Record<string, string | number> = {
      vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: tmnCode,
      vnp_Amount: payment.amount * 100, vnp_CurrCode: 'VND', vnp_TxnRef: payment.providerOrderId,
      vnp_OrderInfo: `Thanh toan don hang ${order.orderCode}`, vnp_OrderType: 'other',
      vnp_Locale: 'vn', vnp_ReturnUrl: returnUrl, vnp_IpAddr: ip || '127.0.0.1',
      vnp_CreateDate: this.dateVn(now), vnp_ExpireDate: this.dateVn(expire),
    };
    const query = this.sortedQuery(params);
    const secureHash = this.hmac('sha512', secret, query);
    const payUrl = `${endpoint}?${query}&vnp_SecureHash=${secureHash}`;
    await this.events.create({ paymentId: payment._id, provider: 'VNPAY', eventType: 'CREATE_URL', externalId: payment.providerOrderId, verified: true, payload: { ...params, vnp_SecureHash: '[REDACTED]' } });
    return { payUrl, providerResponseCode: 'URL_CREATED' };
  }

  async getForBuyer(userId: string, orderCode: string) {
    const order = await this.orders.findOne({ orderCode, buyerId: new Types.ObjectId(userId) }).lean<any>();
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    const payment = await this.payments.findOne({ orderId: order._id }).sort({ createdAt: -1 }).lean<any>();
    return {
      orderCode: order.orderCode, orderStatus: order.status, paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod, totalAmount: order.totalAmount, payment: payment ? this.toClient(payment) : null,
    };
  }

  async handleMomoIpn(payload: Record<string, any>) {
    const providerOrderId = String(payload.orderId || '');
    const payment = providerOrderId ? await this.payments.findOne({ provider: 'MOMO', providerOrderId }).lean<any>() : null;
    const verified = this.verifyMomoIpn(payload);
    await this.events.create({ paymentId: payment?._id, provider: 'MOMO', eventType: 'IPN', externalId: String(payload.transId || payload.requestId || ''), verified, payload });
    if (!verified || !payment) return;
    if (Number(payload.amount) !== payment.amount) return;
    if (Number(payload.resultCode) === 0) {
      await this.finalizeSuccess(payment._id.toString(), String(payload.transId || ''), String(payload.resultCode));
    } else {
      await this.finalizeFailure(payment._id.toString(), 'FAILED', String(payload.resultCode));
    }
  }

  private verifyMomoIpn(payload: Record<string, any>) {
    const accessKey = this.config.get<string>('MOMO_ACCESS_KEY');
    const secretKey = this.config.get<string>('MOMO_SECRET_KEY');
    if (!accessKey || !secretKey || !payload.signature) return false;
    const raw = `accessKey=${accessKey}&amount=${payload.amount ?? ''}&extraData=${payload.extraData ?? ''}&message=${payload.message ?? ''}&orderId=${payload.orderId ?? ''}&orderInfo=${payload.orderInfo ?? ''}&orderType=${payload.orderType ?? ''}&partnerCode=${payload.partnerCode ?? ''}&payType=${payload.payType ?? ''}&requestId=${payload.requestId ?? ''}&responseTime=${payload.responseTime ?? ''}&resultCode=${payload.resultCode ?? ''}&transId=${payload.transId ?? ''}`;
    return this.safeEqual(this.hmac('sha256', secretKey, raw), String(payload.signature));
  }

  async handleVnpayIpn(query: Record<string, any>) {
    const secureHash = String(query.vnp_SecureHash || '');
    const data: Record<string, string | number | undefined> = {};
    for (const [key, value] of Object.entries(query)) {
      if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') continue;
      if (Array.isArray(value)) data[key] = String(value[0] ?? ''); else if (value !== undefined) data[key] = String(value);
    }
    const secret = this.config.get<string>('VNPAY_HASH_SECRET');
    const verified = Boolean(secret && secureHash && this.safeEqual(this.hmac('sha512', secret!, this.sortedQuery(data)), secureHash));
    const providerOrderId = String(query.vnp_TxnRef || '');
    const payment = providerOrderId ? await this.payments.findOne({ provider: 'VNPAY', providerOrderId }).lean<any>() : null;
    await this.events.create({ paymentId: payment?._id, provider: 'VNPAY', eventType: 'IPN', externalId: String(query.vnp_TransactionNo || providerOrderId), verified, payload: query });
    if (!verified) return { RspCode: '97', Message: 'Invalid Checksum' };
    if (!payment) return { RspCode: '01', Message: 'Order not found' };
    if (Number(query.vnp_Amount) !== payment.amount * 100) return { RspCode: '04', Message: 'Invalid amount' };
    if (payment.status === 'SUCCESS') return { RspCode: '02', Message: 'Order already confirmed' };
    if (TERMINAL_PAYMENT_STATUSES.has(payment.status)) return { RspCode: '02', Message: 'Order already closed' };
    if (String(query.vnp_ResponseCode) === '00' && String(query.vnp_TransactionStatus || '00') === '00') {
      const result = await this.finalizeSuccess(payment._id.toString(), String(query.vnp_TransactionNo || ''), String(query.vnp_ResponseCode));
      return result === 'UPDATED' ? { RspCode: '00', Message: 'Confirm Success' } : { RspCode: '02', Message: 'Order already confirmed' };
    }
    await this.finalizeFailure(payment._id.toString(), 'FAILED', String(query.vnp_ResponseCode || '99'));
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  private async finalizeSuccess(paymentId: string, transactionId: string, responseCode: string): Promise<FinalizeResult> {
    const session = await this.connection.startSession();
    let result: FinalizeResult = 'ORDER_NOT_PENDING'; let didUpdate = false; let notifyBuyer=''; let notifyOrder=''; let notifyProvider='';
    try {
      await session.withTransaction(async () => {
        const payment = await this.payments.findById(paymentId).session(session).lean<any>();
        if (!payment) return;
        if (payment.status === 'SUCCESS') { result = 'ALREADY_SUCCESS'; return; }
        if (TERMINAL_PAYMENT_STATUSES.has(payment.status)) { result = 'ALREADY_TERMINAL'; return; }
        const order = await this.orders.findOne({ _id: payment.orderId, status: 'PENDING_PAYMENT', paymentStatus: { $in: ['PENDING', 'PROCESSING'] } }).session(session).lean<any>();
        if (!order) { result = 'ORDER_NOT_PENDING'; return; }
        notifyBuyer=order.buyerId.toString(); notifyOrder=order.orderCode; notifyProvider=payment.provider;
        await this.payments.updateOne({ _id: payment._id, status: { $in: ['PENDING', 'PROCESSING'] } }, { $set: { status: 'SUCCESS', providerTransactionId: transactionId, providerResponseCode: responseCode, paidAt: new Date() } }, { session });
        await this.orders.updateOne({ _id: order._id }, { $set: { paymentStatus: 'SUCCESS', status: 'PAID' } }, { session });
        await this.subOrders.updateMany({ orderId: order._id, status: 'PENDING_PAYMENT' }, { $set: { status: 'PAID' } }, { session });
        await this.orderHistory.create([{ orderId: order._id, fromStatus: 'PENDING_PAYMENT', toStatus: 'PAID', changedBy: order.buyerId, note: `Payment verified via ${payment.provider}` }], { session });
        result = 'UPDATED'; didUpdate = true;
      });
      if(didUpdate&&notifyBuyer)await this.notifications.createSafe({userId:notifyBuyer,type:'PAYMENT',title:'Thanh toán thành công',body:`${notifyOrder} đã được ${notifyProvider} xác minh.`,data:{orderCode:notifyOrder,status:'SUCCESS',provider:notifyProvider}});
      return result;
    } finally { await session.endSession(); }
  }

  private async finalizeFailure(paymentId: string, target: 'FAILED' | 'CANCELLED' | 'EXPIRED', responseCode: string): Promise<FinalizeResult> {
    const payment = await this.payments.findById(paymentId).lean<any>();
    if (!payment) return 'ORDER_NOT_PENDING';
    if (payment.status === 'SUCCESS') return 'ALREADY_SUCCESS';
    if (TERMINAL_PAYMENT_STATUSES.has(payment.status)) return 'ALREADY_TERMINAL';
    return this.releaseOrder(payment.orderId.toString(), paymentId, target, responseCode);
  }

  private async releaseOrder(orderId: string, paymentId: string | null, target: 'FAILED' | 'CANCELLED' | 'EXPIRED', responseCode: string): Promise<FinalizeResult> {
    const session = await this.connection.startSession();
    let result: FinalizeResult = 'ORDER_NOT_PENDING'; let didUpdate = false; let notifyBuyer=''; let notifyOrder='';
    try {
      await session.withTransaction(async () => {
        const order = await this.orders.findOne({ _id: new Types.ObjectId(orderId), status: 'PENDING_PAYMENT', paymentStatus: { $in: ['PENDING', 'PROCESSING'] } }).session(session).lean<any>();
        if (!order) return;
        notifyBuyer=order.buyerId.toString(); notifyOrder=order.orderCode;
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
            createdBy: order.buyerId, note: `Release after payment ${target.toLowerCase()}`,
          }], { session });
        }
        const usages = await this.voucherUsages.find({ orderId: order._id }).session(session).lean<any[]>();
        if (usages.length) {
          await this.voucherUsages.deleteMany({ orderId: order._id }, { session });
          for (const usage of usages) await this.vouchers.updateOne({ _id: usage.voucherId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
        }
        if (paymentId) await this.payments.updateOne({ _id: new Types.ObjectId(paymentId), status: { $in: ['PENDING', 'PROCESSING'] } }, { $set: { status: target, providerResponseCode: responseCode } }, { session });
        await this.orders.updateOne({ _id: order._id }, { $set: { paymentStatus: target === 'FAILED' ? 'FAILED' : 'CANCELLED', status: 'CANCELLED' } }, { session });
        await this.subOrders.updateMany({ orderId: order._id, status: 'PENDING_PAYMENT' }, { $set: { status: 'CANCELLED' } }, { session });
        await this.orderHistory.create([{ orderId: order._id, fromStatus: 'PENDING_PAYMENT', toStatus: 'CANCELLED', changedBy: order.buyerId, note: `Online payment ${target.toLowerCase()}` }], { session });
        result = 'UPDATED'; didUpdate = true;
      });
      if(didUpdate&&notifyBuyer)await this.notifications.createSafe({userId:notifyBuyer,type:'PAYMENT',title:target==='FAILED'?'Thanh toán thất bại':'Thanh toán đã đóng',body:`${notifyOrder} · ${target}`,data:{orderCode:notifyOrder,status:target}});
      return result;
    } finally { await session.endSession(); }
  }

  private async expireOrder(orderId: string, responseCode = 'PAYMENT_TIMEOUT') {
    const payment = await this.payments.findOne({ orderId: new Types.ObjectId(orderId), status: { $in: ['PENDING', 'PROCESSING'] } }).sort({ createdAt: -1 }).lean<any>();
    return this.releaseOrder(orderId, payment?._id?.toString() || null, 'EXPIRED', responseCode);
  }

  async expirePendingPayments() {
    const due = await this.orders.find({ status: 'PENDING_PAYMENT', paymentStatus: { $in: ['PENDING', 'PROCESSING'] }, paymentExpiresAt: { $lte: new Date() } }).select({ _id: 1 }).limit(30).lean<any[]>();
    for (const order of due) {
      try { await this.expireOrder(order._id.toString()); } catch { /* next sweep retries safely */ }
    }
    return { checked: due.length };
  }
  async listForAdmin(q:any){
    const page=Math.max(1,Number(q.page)||1),limit=Math.min(100,Math.max(1,Number(q.limit)||20)); const filter:any={};
    if(q.status)filter.status=q.status; if(q.provider)filter.provider=q.provider;
    if(q.search?.trim()){const raw=q.search.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const rx=new RegExp(raw,'i');filter.$or=[{paymentCode:rx},{orderCode:rx},{providerTransactionId:rx},{requestId:rx}];}
    const [items,total,statusRows,providerRows]=await Promise.all([this.payments.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.payments.countDocuments(filter),this.payments.aggregate([{ $group:{_id:'$status',count:{$sum:1}} }]),this.payments.aggregate([{ $group:{_id:'$provider',count:{$sum:1}} }])]);
    return {items:items.map(x=>({...x,_id:x._id.toString(),orderId:x.orderId?.toString?.(),buyerId:x.buyerId?.toString?.()})),meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))},statusCounts:Object.fromEntries(statusRows.map((r:any)=>[r._id,r.count])),providerCounts:Object.fromEntries(providerRows.map((r:any)=>[r._id,r.count]))};
  }

  async getForAdmin(paymentCode:string){
    const payment=await this.payments.findOne({paymentCode}).lean<any>(); if(!payment)throw new NotFoundException('PAYMENT_NOT_FOUND');
    const [order,events]=await Promise.all([this.orders.findById(payment.orderId).lean<any>(),this.events.find({paymentId:payment._id}).sort({createdAt:1}).lean<any[]>()]);
    return {...payment,_id:payment._id.toString(),orderId:payment.orderId?.toString?.(),buyerId:payment.buyerId?.toString?.(),order:order?{...order,_id:order._id.toString(),buyerId:order.buyerId?.toString?.()}:null,events:events.map(e=>({...e,_id:e._id.toString(),paymentId:e.paymentId?.toString?.(),payload:this.redactAdminPayload(e.payload)}))};
  }

  private redactAdminPayload(payload:any){
    if(!payload||typeof payload!=='object')return payload; const out:any={...payload}; for(const k of ['signature','vnp_SecureHash','secureHash','accessKey','secretKey'])if(k in out)out[k]='[REDACTED]'; return out;
  }

}
