import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, ClientSession, Model, Types } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { Cart } from '../cart/cart.schema';
import { ProductVariant } from '../variants/product-variant.schema';
import { Product } from '../products/product.schema';
import { Shop } from '../shops/shop.schema';
import { Inventory } from '../inventory/inventory.schema';
import { InventoryTransaction } from '../inventory/inventory-transaction.schema';
import { Address } from '../users/address.schema';
import { Voucher, VoucherUsage } from '../vouchers/voucher.schema';
import { PromotionCampaign } from '../promotions/promotion.schema';
import { Order, OrderItem, OrderStatusHistory, SubOrder } from '../orders/order.schema';
import { CheckoutPreviewDto, CreateCheckoutDto } from './checkout.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { FinanceService } from '../finance/finance.service';
import { SettingsService } from '../settings/settings.service';

type CheckoutLine = {
  quantity: number; variant: any; product: any; shop: any; inventory: any;
  originalUnitPrice: number; unitPrice: number; originalLineTotal: number; lineTotal: number;
  campaignDiscount: number; campaign?: any;
};
type CheckoutGroup = {
  shop: any; originalSubtotal: number; subtotal: number; campaignDiscount: number; shippingFee: number; items: CheckoutLine[];
};
type ShopVoucherResult = { voucher: any; discountAmount: number; eligibleSubtotal: number };

@Injectable()
export class CheckoutService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Cart.name) private readonly carts: Model<Cart>,
    @InjectModel(ProductVariant.name) private readonly variants: Model<ProductVariant>,
    @InjectModel(Product.name) private readonly products: Model<Product>,
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    @InjectModel(Inventory.name) private readonly inventories: Model<Inventory>,
    @InjectModel(InventoryTransaction.name) private readonly inventoryTransactions: Model<InventoryTransaction>,
    @InjectModel(Address.name) private readonly addresses: Model<Address>,
    @InjectModel(Voucher.name) private readonly vouchers: Model<Voucher>,
    @InjectModel(VoucherUsage.name) private readonly voucherUsages: Model<VoucherUsage>,
    @InjectModel(PromotionCampaign.name) private readonly campaigns: Model<PromotionCampaign>,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(SubOrder.name) private readonly subOrders: Model<SubOrder>,
    @InjectModel(OrderItem.name) private readonly orderItems: Model<OrderItem>,
    @InjectModel(OrderStatusHistory.name) private readonly orderHistory: Model<OrderStatusHistory>,
    private readonly notifications: NotificationsService,
    private readonly finance: FinanceService,
    private readonly settings: SettingsService,
  ) {}

  private orderCode(prefix = 'XIII') { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`; }
  private campaignUnitDiscount(c: any, price: number) {
    const raw = c.type === 'PERCENT' ? Math.floor(price * (c.value / 100)) : c.value;
    return Math.min(price, c.maxDiscount ? Math.min(raw, c.maxDiscount) : raw);
  }

  private allocateDiscount<T>(amount: number, lines: T[], key: (line: T) => string, base: (line: T) => number) {
    const out = new Map<string, number>();
    if (amount <= 0 || !lines.length) return out;
    const totalBase = lines.reduce((sum, line) => sum + Math.max(0, base(line)), 0);
    if (totalBase <= 0) return out;
    const target = Math.min(Math.max(0, Math.floor(amount)), totalBase);
    const shares = lines.map((line, index) => {
      const capacity = Math.max(0, base(line));
      const exact = target * capacity / totalBase;
      return { id: key(line), index, capacity, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let remaining = target - shares.reduce((sum, line) => sum + line.value, 0);
    // Largest remainders preserve every đồng, including a free final item.
    for (const line of [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
      if (remaining > 0 && line.value < line.capacity) { line.value++; remaining--; }
    }
    for (const line of shares) out.set(line.id, line.value);
    return out;
  }

  private async loadCart(userId: string, shippingMethod: 'STANDARD'|'EXPRESS', session?: ClientSession) {
    const cartQuery = this.carts.findOne({ userId: new Types.ObjectId(userId) }); if (session) cartQuery.session(session);
    const cart = await cartQuery.lean<any>(); if (!cart?.items?.length) throw new ConflictException('CART_EMPTY');
    const variantIds = cart.items.map((x: any) => x.variantId);
    const vq = this.variants.find({ _id: { $in: variantIds } }); const iq = this.inventories.find({ variantId: { $in: variantIds } });
    if (session) { vq.session(session); iq.session(session); }
    const [variants, inventories] = await Promise.all([vq.lean<any[]>(), iq.lean<any[]>()]);
    const productIds = variants.map(v => v.productId); const shopIds = variants.map(v => v.shopId);
    const pq = this.products.find({ _id: { $in: productIds } }); const sq = this.shops.find({ _id: { $in: shopIds } });
    const now = new Date(); const cq = this.campaigns.find({ shopId: { $in: shopIds }, active: true, archivedAt: { $exists: false }, startAt: { $lte: now }, endAt: { $gte: now } });
    if (session) { pq.session(session); sq.session(session); cq.session(session); }
    const [products, shops, campaigns] = await Promise.all([pq.lean<any[]>(), sq.lean<any[]>(), cq.lean<any[]>()]);
    const variantMap = new Map(variants.map(v => [v._id.toString(), v])); const productMap = new Map(products.map(p => [p._id.toString(), p]));
    const shopMap = new Map(shops.map(s => [s._id.toString(), s])); const invMap = new Map(inventories.map(i => [i.variantId.toString(), i]));
    const marketplaceSettings = await this.settings.get(session);
    const shippingPrice = shippingMethod === 'STANDARD' ? marketplaceSettings.standardShippingFee : marketplaceSettings.expressShippingFee;
    const grouped = new Map<string, CheckoutGroup>(); let subtotal = 0; let originalSubtotal = 0; let campaignDiscount = 0; let itemCount = 0;

    for (const raw of cart.items) {
      const key = raw.variantId.toString(); const variant = variantMap.get(key); if (!variant || variant.status !== 'ACTIVE') throw new ConflictException('VARIANT_NOT_AVAILABLE');
      const product = productMap.get(variant.productId.toString()); if (!product || product.status !== 'ACTIVE') throw new ConflictException('PRODUCT_NOT_AVAILABLE');
      const shop = shopMap.get(variant.shopId.toString()); if (!shop || shop.status !== 'ACTIVE') throw new ConflictException('SHOP_NOT_AVAILABLE');
      const inventory = invMap.get(key); if (!inventory || inventory.available < raw.quantity) throw new ConflictException('PRODUCT_OUT_OF_STOCK');
      const eligible = campaigns.filter(c => c.shopId.toString() === shop._id.toString() && (c.scope === 'ALL_PRODUCTS' || (c.productIds || []).some((id: any) => id.toString() === product._id.toString())));
      let campaign: any = null; let best = 0; for (const c of eligible) { const d = this.campaignUnitDiscount(c, variant.price); if (d > best) { best = d; campaign = c; } }
      const originalUnitPrice = variant.price; const unitPrice = Math.max(0, originalUnitPrice - best); const originalLineTotal = originalUnitPrice * raw.quantity; const lineTotal = unitPrice * raw.quantity; const lineCampaignDiscount = originalLineTotal - lineTotal;
      originalSubtotal += originalLineTotal; subtotal += lineTotal; campaignDiscount += lineCampaignDiscount; itemCount += raw.quantity;
      const shopKey = shop._id.toString(); if (!grouped.has(shopKey)) grouped.set(shopKey, { shop, originalSubtotal: 0, subtotal: 0, campaignDiscount: 0, shippingFee: shippingPrice, items: [] });
      const group = grouped.get(shopKey)!; group.originalSubtotal += originalLineTotal; group.subtotal += lineTotal; group.campaignDiscount += lineCampaignDiscount;
      group.items.push({ quantity: raw.quantity, variant, product, shop, inventory, originalUnitPrice, unitPrice, originalLineTotal, lineTotal, campaignDiscount: lineCampaignDiscount, campaign });
    }
    const groups = [...grouped.values()]; const shippingFee = groups.reduce((s,g) => s + g.shippingFee, 0);
    return { cart, groups, originalSubtotal, subtotal, campaignDiscount, shippingFee, itemCount, marketplaceSettings };
  }

  private async resolveAddress(userId: string, addressId: string, session?: ClientSession) {
    const q = this.addresses.findOne({ _id: new Types.ObjectId(addressId), userId: new Types.ObjectId(userId) }); if (session) q.session(session);
    const address = await q.lean<any>(); if (!address) throw new NotFoundException('ADDRESS_NOT_FOUND'); return address;
  }

  private async assertUsage(userId: string, voucher: any, session?: ClientSession) {
    if (voucher.quantity > 0 && voucher.usedCount >= voucher.quantity) throw new ConflictException('VOUCHER_SOLD_OUT');
    const q = this.voucherUsages.countDocuments({ voucherId: voucher._id, userId: new Types.ObjectId(userId) }); if (session) q.session(session);
    if ((await q) >= voucher.perUserLimit) throw new ConflictException('VOUCHER_USER_LIMIT_REACHED');
  }

  private async resolvePlatformVoucher(userId: string, code: string|undefined, subtotal: number, shippingFee: number, session?: ClientSession) {
    if (!code?.trim()) return { voucher: null as any, discountAmount: 0, shippingDiscount: 0 };
    const now = new Date(); const q = this.vouchers.findOne({ ownerType: 'PLATFORM', code: code.trim().toUpperCase(), active: true, archivedAt: { $exists: false }, startAt: { $lte: now }, endAt: { $gte: now } }); if (session) q.session(session);
    const voucher = await q.lean<any>(); if (!voucher) throw new ConflictException('PLATFORM_VOUCHER_NOT_AVAILABLE'); await this.assertUsage(userId, voucher, session);
    if (subtotal < voucher.minimumSpend) throw new ConflictException('VOUCHER_MINIMUM_SPEND_NOT_MET'); let discountAmount = 0; let shippingDiscount = 0;
    if (voucher.type === 'FIXED') discountAmount = Math.min(subtotal, voucher.value);
    if (voucher.type === 'PERCENT') { const raw = Math.floor(subtotal * voucher.value / 100); discountAmount = Math.min(subtotal, voucher.maxDiscount ? Math.min(raw, voucher.maxDiscount) : raw); }
    if (voucher.type === 'FREE_SHIPPING') shippingDiscount = Math.min(shippingFee, voucher.maxDiscount || voucher.value || shippingFee);
    return { voucher, discountAmount, shippingDiscount };
  }

  private async resolveShopVouchers(userId: string, codes: string[]|undefined, groups: CheckoutGroup[], session?: ClientSession) {
    const normalized = [...new Set((codes || []).map(x => x.trim().toUpperCase()).filter(Boolean))];
    const result = new Map<string, ShopVoucherResult>(); if (!normalized.length) return result;
    const now = new Date(); const q = this.vouchers.find({ ownerType: 'SHOP', code: { $in: normalized }, active: true, archivedAt: { $exists: false }, startAt: { $lte: now }, endAt: { $gte: now } }); if (session) q.session(session);
    const rows = await q.lean<any[]>(); if (rows.length !== normalized.length) throw new ConflictException('SHOP_VOUCHER_NOT_AVAILABLE');
    for (const voucher of rows) {
      const group = groups.find(g => g.shop._id.toString() === voucher.shopId?.toString()); if (!group) throw new ConflictException('SHOP_VOUCHER_NOT_FOR_CART');
      const shopKey = group.shop._id.toString(); if (result.has(shopKey)) throw new ConflictException('ONE_SHOP_VOUCHER_PER_SHOP'); if (voucher.type === 'FREE_SHIPPING') throw new ConflictException('SELLER_FREE_SHIPPING_NOT_SUPPORTED');
      await this.assertUsage(userId, voucher, session);
      const eligibleIds = new Set((voucher.productIds || []).map((x: any) => x.toString()));
      const eligibleSubtotal = voucher.scope === 'SELECTED_PRODUCTS' ? group.items.filter(i => eligibleIds.has(i.product._id.toString())).reduce((s,i) => s + i.lineTotal, 0) : group.subtotal;
      if (eligibleSubtotal <= 0) throw new ConflictException('SHOP_VOUCHER_NO_ELIGIBLE_PRODUCT'); if (eligibleSubtotal < voucher.minimumSpend) throw new ConflictException('SHOP_VOUCHER_MINIMUM_SPEND_NOT_MET');
      const raw = voucher.type === 'PERCENT' ? Math.floor(eligibleSubtotal * voucher.value / 100) : voucher.value; const discountAmount = Math.min(eligibleSubtotal, voucher.maxDiscount ? Math.min(raw, voucher.maxDiscount) : raw);
      result.set(shopKey, { voucher, discountAmount, eligibleSubtotal });
    }
    return result;
  }

  private publicGroups(groups: CheckoutGroup[], shopVouchers = new Map<string, ShopVoucherResult>()) {
    return groups.map(group => { const sv = shopVouchers.get(group.shop._id.toString()); return {
      shop: { _id: group.shop._id.toString(), name: group.shop.name, slug: group.shop.slug, verified: group.shop.verified }, originalSubtotal: group.originalSubtotal, subtotal: group.subtotal, campaignDiscount: group.campaignDiscount, shopVoucherDiscount: sv?.discountAmount || 0, shopVoucher: sv ? { code: sv.voucher.code, name: sv.voucher.name } : null, shippingFee: group.shippingFee,
      items: group.items.map(line => ({ variantId: line.variant._id.toString(), quantity: line.quantity, originalLineTotal: line.originalLineTotal, lineTotal: line.lineTotal, campaignDiscount: line.campaignDiscount,
        campaign: line.campaign ? { id: line.campaign._id.toString(), name: line.campaign.name, type: line.campaign.type, value: line.campaign.value } : null,
        product: { _id: line.product._id.toString(), name: line.product.name, slug: line.product.slug, image: line.variant.image || line.product.images?.[0] || '' },
        variant: { sku: line.variant.sku, attributes: line.variant.attributes, price: line.unitPrice, originalPrice: line.originalUnitPrice },
      })) } });
  }

  async preview(userId: string, dto: CheckoutPreviewDto) {
    const [address, loaded] = await Promise.all([this.resolveAddress(userId, dto.addressId), this.loadCart(userId, dto.shippingMethod)]);
    const paymentFlags:any={COD:'codEnabled',MOMO:'momoEnabled',VNPAY:'vnpayEnabled'}; const method=(dto as any).paymentMethod as string|undefined; if(method && !loaded.marketplaceSettings[paymentFlags[method]]) throw new ConflictException('PAYMENT_METHOD_DISABLED');
    const shopVouchers = await this.resolveShopVouchers(userId, dto.shopVoucherCodes, loaded.groups);
    const shopVoucherDiscount = [...shopVouchers.values()].reduce((s,x) => s + x.discountAmount, 0);
    const platform = await this.resolvePlatformVoucher(userId, dto.voucherCode, Math.max(0, loaded.subtotal - shopVoucherDiscount), loaded.shippingFee);
    const shippingFeeAfterDiscount = Math.max(0, loaded.shippingFee - platform.shippingDiscount);
    const totalAmount = Math.max(0, loaded.subtotal + shippingFeeAfterDiscount - platform.discountAmount - shopVoucherDiscount);
    return { address, shippingMethod: dto.shippingMethod, shops: this.publicGroups(loaded.groups, shopVouchers), summary: { itemCount: loaded.itemCount, originalSubtotal: loaded.originalSubtotal, subtotal: loaded.subtotal, campaignDiscount: loaded.campaignDiscount, shopVoucherDiscount, shippingFee: loaded.shippingFee, shippingDiscount: platform.shippingDiscount, discountAmount: platform.discountAmount, totalAmount },
      voucher: platform.voucher ? { code: platform.voucher.code, type: platform.voucher.type, value: platform.voucher.value } : null,
      shopVouchers: [...shopVouchers.values()].map(x => ({ shopId: x.voucher.shopId.toString(), code: x.voucher.code, name: x.voucher.name, discountAmount: x.discountAmount })) };
  }

  private async consumeVoucher(userId: string, orderId: Types.ObjectId, result: { voucher: any; discountAmount?: number; shippingDiscount?: number }, session: ClientSession) {
    if (!result.voucher) return; const amountSaved = (result.discountAmount || 0) + (result.shippingDiscount || 0);
    const updated = await this.vouchers.updateOne({ _id: result.voucher._id, usedCount: result.voucher.usedCount }, { $inc: { usedCount: 1 } }, { session }); if (updated.modifiedCount !== 1) throw new ConflictException('VOUCHER_CONCURRENT_UPDATE');
    await this.voucherUsages.create([{ voucherId: result.voucher._id, userId: new Types.ObjectId(userId), orderId, amountSaved, usedAt: new Date() }], { session });
  }

  async create(userId: string, dto: CreateCheckoutDto) {
    const session = await this.connection.startSession(); let result: any; const notifySellers: any[] = [];
    try {
      await session.withTransaction(async () => {
        notifySellers.length = 0;
        const address = await this.resolveAddress(userId, dto.addressId, session); const loaded = await this.loadCart(userId, dto.shippingMethod, session);
        const paymentFlags:any={COD:'codEnabled',MOMO:'momoEnabled',VNPAY:'vnpayEnabled'}; if(!loaded.marketplaceSettings[paymentFlags[dto.paymentMethod]]) throw new ConflictException('PAYMENT_METHOD_DISABLED');
        const shopVouchers = await this.resolveShopVouchers(userId, dto.shopVoucherCodes, loaded.groups, session);
        const shopVoucherDiscount = [...shopVouchers.values()].reduce((s,x) => s + x.discountAmount, 0);
        const platform = await this.resolvePlatformVoucher(userId, dto.voucherCode, Math.max(0, loaded.subtotal - shopVoucherDiscount), loaded.shippingFee, session);
        const shippingFeeAfterDiscount = Math.max(0, loaded.shippingFee - platform.shippingDiscount);
        const lineShopDiscounts = new Map<string, number>();
        for (const group of loaded.groups) {
          const sv = shopVouchers.get(group.shop._id.toString()); if (!sv) continue;
          const eligibleIds = new Set((sv.voucher.productIds || []).map((x: any) => x.toString()));
          const eligibleLines = sv.voucher.scope === 'SELECTED_PRODUCTS' ? group.items.filter(line => eligibleIds.has(line.product._id.toString())) : group.items;
          const allocated = this.allocateDiscount(sv.discountAmount, eligibleLines, line => (line as CheckoutLine).variant._id.toString(), line => (line as CheckoutLine).lineTotal);
          for (const [key, value] of allocated) lineShopDiscounts.set(key, value);
        }
        const allLines = loaded.groups.flatMap(group => group.items);
        const linePlatformDiscounts = this.allocateDiscount(platform.discountAmount, allLines, line => (line as CheckoutLine).variant._id.toString(), line => Math.max(0, (line as CheckoutLine).lineTotal - (lineShopDiscounts.get((line as CheckoutLine).variant._id.toString()) || 0)));
        const totalAmount = Math.max(0, loaded.subtotal + shippingFeeAfterDiscount - platform.discountAmount - shopVoucherDiscount); const masterStatus = dto.paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT'; const orderCode = this.orderCode('XIII');
        const financeSettings = await this.finance.getSettings(session); const platformFeeRate = financeSettings.commissionRateBps / 10000;
        const [order] = await this.orders.create([{ orderCode, buyerId: new Types.ObjectId(userId), shippingAddress: { recipientName: address.recipientName, phone: address.phone, province: address.province, district: address.district, ward: address.ward, addressLine: address.addressLine, label: address.label }, shippingMethod: dto.shippingMethod,
          subtotal: loaded.subtotal, originalSubtotal: loaded.originalSubtotal, shippingFee: loaded.shippingFee, campaignDiscount: loaded.campaignDiscount, sellerDiscount: loaded.campaignDiscount + shopVoucherDiscount,
          discountAmount: loaded.campaignDiscount + shopVoucherDiscount + platform.discountAmount + platform.shippingDiscount, platformDiscount: platform.discountAmount + platform.shippingDiscount, platformProductDiscount: platform.discountAmount, platformShippingDiscount: platform.shippingDiscount, totalAmount,
          paymentMethod: dto.paymentMethod, paymentStatus: 'PENDING', paymentExpiresAt: dto.paymentMethod === 'COD' ? undefined : new Date(Date.now() + Number(loaded.marketplaceSettings.paymentExpiresMinutes) * 60_000), status: masterStatus, voucherCode: platform.voucher?.code, shopVoucherCodes: [...shopVouchers.values()].map(x => x.voucher.code) }], { session });

        let allocatedShippingDiscount = 0;
        for (let gi=0; gi<loaded.groups.length; gi++) {
          const group = loaded.groups[gi]; const sv = shopVouchers.get(group.shop._id.toString()); const voucherDiscount = sv?.discountAmount || 0;
          const rawShip = loaded.shippingFee > 0 ? Math.floor(platform.shippingDiscount * group.shippingFee / loaded.shippingFee) : 0; const groupShipDiscount = gi === loaded.groups.length-1 ? platform.shippingDiscount - allocatedShippingDiscount : rawShip; allocatedShippingDiscount += groupShipDiscount;
          const effectiveShipping = Math.max(0, group.shippingFee - groupShipDiscount); const feeBase = Math.max(0, group.subtotal - voucherDiscount); const platformFee = Math.floor(feeBase * platformFeeRate); const sellerRevenue = Math.max(0, feeBase - platformFee);
          const [subOrder] = await this.subOrders.create([{ orderId: order._id, shopId: group.shop._id, sellerId: group.shop.ownerId, subOrderCode: this.orderCode('SUB'), subtotal: group.subtotal, originalSubtotal: group.originalSubtotal,
            campaignDiscount: group.campaignDiscount, voucherDiscount, voucherCode: sv?.voucher.code, shopDiscount: group.campaignDiscount + voucherDiscount, shippingFee: effectiveShipping, platformFee, sellerRevenue, status: masterStatus }], { session });
          await this.orderHistory.create([{ orderId: order._id, subOrderId: subOrder._id, toStatus: masterStatus, changedBy: new Types.ObjectId(userId), note: 'SubOrder created by checkout' }], { session });
          notifySellers.push({ userId: group.shop.ownerId.toString(), subOrderCode: subOrder.subOrderCode, orderCode, paymentMethod: dto.paymentMethod, totalAmount: feeBase + effectiveShipping });
          for (const line of group.items) {
            const upd = await this.inventories.updateOne({ _id: line.inventory._id, available: { $gte: line.quantity } }, { $inc: { available: -line.quantity, reserved: line.quantity } }, { session }); if (upd.modifiedCount !== 1) throw new ConflictException('PRODUCT_OUT_OF_STOCK');
            const latest = await this.inventories.findById(line.inventory._id).session(session).lean<any>(); const after = latest?.available ?? Math.max(0, line.inventory.available-line.quantity);
            await this.orderItems.create([{ orderId: order._id, subOrderId: subOrder._id, productId: line.product._id, variantId: line.variant._id, shopId: group.shop._id, productName: line.product.name,
              variantSnapshot: { sku: line.variant.sku, attributes: line.variant.attributes, price: line.unitPrice, originalPrice: line.originalUnitPrice }, image: line.variant.image || line.product.images?.[0] || '', quantity: line.quantity,
              originalUnitPrice: line.originalUnitPrice, unitPrice: line.unitPrice, campaignDiscount: line.campaignDiscount, campaignId: line.campaign?._id, campaignName: line.campaign?.name || '',
              shopVoucherDiscount: lineShopDiscounts.get(line.variant._id.toString()) || 0, platformProductDiscount: linePlatformDiscounts.get(line.variant._id.toString()) || 0,
              buyerPaidProductAmount: Math.max(0, line.lineTotal - (lineShopDiscounts.get(line.variant._id.toString()) || 0) - (linePlatformDiscounts.get(line.variant._id.toString()) || 0)), totalPrice: line.lineTotal }], { session });
            await this.inventoryTransactions.create([{ shopId: group.shop._id, variantId: line.variant._id, type: 'RESERVE', quantity: line.quantity, referenceType: 'ORDER', referenceId: order._id, beforeQuantity: after + line.quantity, afterQuantity: after, createdBy: new Types.ObjectId(userId), note: `Reserve for ${orderCode}` }], { session });
          }
        }
        await this.orderHistory.create([{ orderId: order._id, toStatus: masterStatus, changedBy: new Types.ObjectId(userId), note: dto.paymentMethod === 'COD' ? 'Order placed with COD' : 'Waiting for online payment' }], { session });
        await this.consumeVoucher(userId, order._id, platform, session); for (const sv of shopVouchers.values()) await this.consumeVoucher(userId, order._id, { voucher: sv.voucher, discountAmount: sv.discountAmount }, session);
        await this.carts.updateOne({ _id: loaded.cart._id }, { $set: { items: [] } }, { session }); result = { orderId: order._id.toString(), orderCode, status: masterStatus, paymentMethod: dto.paymentMethod, paymentStatus: 'PENDING', totalAmount, nextAction: dto.paymentMethod === 'COD' ? 'ORDER_CONFIRMED' : 'CREATE_PAYMENT' };
      });
      for (const t of notifySellers) await this.notifications.createSafe({ userId: t.userId, type: 'ORDER_CREATED', title: 'Bạn có đơn hàng mới', body: `${t.subOrderCode} · ${t.paymentMethod} · ${new Intl.NumberFormat('vi-VN').format(t.totalAmount)}₫`, data: { orderCode: t.orderCode, subOrderCode: t.subOrderCode } });
      return result;
    } finally { await session.endSession(); }
  }
}
