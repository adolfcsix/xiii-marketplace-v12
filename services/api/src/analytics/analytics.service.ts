import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../auth/user.schema';
import { SellerLedgerEntry, WithdrawalRequest } from '../finance/finance.schema';
import { Inventory } from '../inventory/inventory.schema';
import { Order, OrderItem, SubOrder } from '../orders/order.schema';
import { Payment } from '../payments/payment.schema';
import { Product } from '../products/product.schema';
import { Dispute, Refund, ReturnRequest } from '../returns/return.schema';
import { CustomerReview } from '../reviews/customer-review.schema';
import { Shop } from '../shops/shop.schema';
import { ProductVariant } from '../variants/product-variant.schema';
import { AnalyticsRangeDto } from './analytics.dto';
import { AnalyticsEvent } from './analytics-event.schema';
import { ShopAccessService } from '../access-control/shop-access.service';

const SELLABLE_STATUSES = ['PAID','CONFIRMED','PACKING','READY_TO_SHIP','SHIPPED','DELIVERED','COMPLETED','RETURN_REQUESTED','RETURN_APPROVED','RETURN_REJECTED','RETURNED','REFUND_PENDING','REFUNDED','DISPUTED'];
const TZ = 'Asia/Ho_Chi_Minh';
const DAY = 86400000;

type Range = { from: Date; to: Date; fromLabel: string; toLabel: string; days: number };

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(AnalyticsEvent.name) private readonly events: Model<AnalyticsEvent>,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(SubOrder.name) private readonly subOrders: Model<SubOrder>,
    @InjectModel(OrderItem.name) private readonly orderItems: Model<OrderItem>,
    @InjectModel(Product.name) private readonly products: Model<Product>,
    @InjectModel(ProductVariant.name) private readonly variants: Model<ProductVariant>,
    @InjectModel(Inventory.name) private readonly inventories: Model<Inventory>,
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Payment.name) private readonly payments: Model<Payment>,
    @InjectModel(ReturnRequest.name) private readonly returns: Model<ReturnRequest>,
    @InjectModel(Refund.name) private readonly refunds: Model<Refund>,
    @InjectModel(Dispute.name) private readonly disputes: Model<Dispute>,
    @InjectModel(CustomerReview.name) private readonly reviews: Model<CustomerReview>,
    @InjectModel(SellerLedgerEntry.name) private readonly ledger: Model<SellerLedgerEntry>,
    @InjectModel(WithdrawalRequest.name) private readonly withdrawals: Model<WithdrawalRequest>,
    private readonly shopAccess: ShopAccessService,
  ) {}

  private objectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('INVALID_ID');
    return new Types.ObjectId(id);
  }

  private dateLabel(date: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  private range(query: AnalyticsRangeDto): Range {
    const now = new Date();
    const toLabel = query.to?.slice(0, 10) || this.dateLabel(now);
    const defaultFrom = new Date(now.getTime() - 29 * DAY);
    const fromLabel = query.from?.slice(0, 10) || this.dateLabel(defaultFrom);
    const from = new Date(`${fromLabel}T00:00:00+07:00`);
    const to = new Date(`${toLabel}T23:59:59.999+07:00`);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) throw new BadRequestException('INVALID_ANALYTICS_RANGE');
    const days = Math.floor((to.getTime() - from.getTime()) / DAY) + 1;
    if (days > 366) throw new BadRequestException('ANALYTICS_RANGE_MAX_366_DAYS');
    return { from, to, fromLabel, toLabel, days };
  }

  private dayLabels(range: Range) {
    const result: string[] = [];
    const cursor = new Date(range.from);
    while (cursor <= range.to) {
      result.push(this.dateLabel(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  }

  private fillTrend(range: Range, rows: any[], viewRows: any[] = [], refundRows: any[] = []) {
    const byDay = new Map(rows.map(row => [row._id, row]));
    const views = new Map(viewRows.map(row => [row._id, row.count]));
    const refunds = new Map(refundRows.map(row => [row._id, row.amount]));
    return this.dayLabels(range).map(date => {
      const row = byDay.get(date) || {};
      return {
        date,
        orders: Number(row.orders || 0),
        grossSales: Number(row.grossSales || 0),
        netRevenue: Number(row.netRevenue || 0),
        platformRevenue: Number(row.platformRevenue || 0),
        views: Number(views.get(date) || 0),
        refunds: Number(refunds.get(date) || 0),
      };
    });
  }

  async seller(userId: string, query: AnalyticsRangeDto) {
    const access = await this.shopAccess.resolve(userId, true);
    const sellerId = access.ownerId;
    const range = this.range(query);
    const shop = await this.shops.findById(access.shopId).select({ name: 1, slug: 1, ratingAverage: 1, ratingCount: 1 }).lean<any>();
    if (!shop) throw new NotFoundException('SHOP_NOT_FOUND');
    const shopId = shop._id as Types.ObjectId;
    const orderMatch = { sellerId, createdAt: { $gte: range.from, $lte: range.to }, status: { $in: SELLABLE_STATUSES } };

    const [summaryRows, trendRows, statusRows, viewRows, viewTotal, refundRows, refundDaily, returnCount, reviewRows, reviewDistribution, products, inventoryAgg, financeRows, withdrawalRows, topRows] = await Promise.all([
      this.subOrders.aggregate([
        { $match: orderMatch },
        { $group: { _id: null, orders: { $sum: 1 }, grossSales: { $sum: { $add: ['$sellerRevenue', '$platformFee'] } }, sellerRevenue: { $sum: '$sellerRevenue' }, platformFees: { $sum: '$platformFee' }, campaignDiscount: { $sum: { $ifNull: ['$campaignDiscount', 0] } }, voucherDiscount: { $sum: { $ifNull: ['$voucherDiscount', 0] } } } },
      ]),
      this.subOrders.aggregate([
        { $match: orderMatch },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, orders: { $sum: 1 }, grossSales: { $sum: { $add: ['$sellerRevenue', '$platformFee'] } }, netRevenue: { $sum: '$sellerRevenue' } } }, { $sort: { _id: 1 } },
      ]),
      this.subOrders.aggregate([{ $match: { sellerId, createdAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.events.aggregate([{ $match: { shopId, type: 'PRODUCT_VIEW', createdAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, count: { $sum: 1 } } }]),
      this.events.countDocuments({ shopId, type: 'PRODUCT_VIEW', createdAt: { $gte: range.from, $lte: range.to } }),
      this.refunds.aggregate([{ $match: { shopId, status: 'SUCCEEDED', createdAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      this.refunds.aggregate([{ $match: { shopId, status: 'SUCCEEDED', createdAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, amount: { $sum: '$amount' } } }]),
      this.returns.countDocuments({ shopId, createdAt: { $gte: range.from, $lte: range.to } }),
      this.reviews.aggregate([{ $match: { shopId, status: 'PUBLISHED', createdAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$rating' } } }]),
      this.reviews.aggregate([{ $match: { shopId, status: 'PUBLISHED', createdAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
      this.products.find({ shopId }).select({ name: 1, slug: 1, status: 1, viewCount: 1, soldCount: 1, ratingAverage: 1, ratingCount: 1 }).lean<any[]>(),
      this.inventories.aggregate([
        { $match: { shopId } },
        { $lookup: { from: 'productvariants', localField: 'variantId', foreignField: '_id', as: 'variant' } },
        { $addFields: { v: { $arrayElemAt: ['$variant', 0] } } },
        { $group: { _id: null, totalSkus: { $sum: 1 }, availableUnits: { $sum: '$available' }, reservedUnits: { $sum: '$reserved' }, soldUnits: { $sum: '$sold' }, lowStockSkus: { $sum: { $cond: [{ $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$lowStockThreshold'] }] }, 1, 0] } }, outOfStockSkus: { $sum: { $cond: [{ $lte: ['$available', 0] }, 1, 0] } }, retailInventoryValue: { $sum: { $multiply: ['$available', { $ifNull: ['$v.price', 0] }] } } } },
      ]),
      this.ledger.aggregate([{ $match: { sellerId } }, { $group: { _id: '$status', amount: { $sum: '$amount' } } }]),
      this.withdrawals.aggregate([{ $match: { sellerId } }, { $group: { _id: '$status', amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      this.orderItems.aggregate([
        { $lookup: { from: 'suborders', localField: 'subOrderId', foreignField: '_id', as: 'sub' } },
        { $addFields: { sub: { $arrayElemAt: ['$sub', 0] } } },
        { $match: { shopId, 'sub.sellerId': sellerId, 'sub.createdAt': { $gte: range.from, $lte: range.to }, 'sub.status': { $in: SELLABLE_STATUSES } } },
        { $group: { _id: '$productId', name: { $first: '$productName' }, units: { $sum: '$quantity' }, revenue: { $sum: { $subtract: ['$totalPrice', { $ifNull: ['$shopVoucherDiscount', 0] }] } } } },
        { $sort: { revenue: -1, units: -1 } }, { $limit: 8 },
      ]),
    ]);

    const productById = new Map(products.map(product => [product._id.toString(), product]));
    const topProducts = await Promise.all(topRows.map(async row => {
      const product = productById.get(row._id.toString());
      const rangeViews = await this.events.countDocuments({ productId: row._id, type: 'PRODUCT_VIEW', createdAt: { $gte: range.from, $lte: range.to } });
      return { productId: row._id.toString(), name: row.name, slug: product?.slug || '', units: row.units, revenue: row.revenue, views: rangeViews, orderPerViewRate: rangeViews ? Number(((row.units / rangeViews) * 100).toFixed(2)) : 0 };
    }));

    const summary = summaryRows[0] || {};
    const refund = refundRows[0] || {};
    const reviews = reviewRows[0] || {};
    const inventory = inventoryAgg[0] || {};
    const finance = Object.fromEntries(financeRows.map((row: any) => [row._id, row.amount]));
    const withdrawals = Object.fromEntries(withdrawalRows.map((row: any) => [row._id, { amount: row.amount, count: row.count }]));
    const statusCounts = Object.fromEntries(statusRows.map((row: any) => [row._id, row.count]));
    const ratingDistribution = Object.fromEntries([1,2,3,4,5].map(rating => [rating, reviewDistribution.find((row: any) => row._id === rating)?.count || 0]));
    const orders = Number(summary.orders || 0);
    const grossSales = Number(summary.grossSales || 0);
    const refundAmount = Number(refund.amount || 0);
    const netBeforeRefund = Number(summary.sellerRevenue || 0);

    return {
      range: { from: range.fromLabel, to: range.toLabel, days: range.days, timezone: TZ },
      shop: { _id: shopId.toString(), name: shop.name, slug: shop.slug, ratingAverage: shop.ratingAverage, ratingCount: shop.ratingCount },
      kpis: {
        orders,
        grossSales,
        sellerRevenueBeforeRefund: netBeforeRefund,
        refundAmount,
        estimatedNetRevenue: Math.max(0, netBeforeRefund - refundAmount),
        platformFees: Number(summary.platformFees || 0),
        sellerDiscount: Number(summary.campaignDiscount || 0) + Number(summary.voucherDiscount || 0),
        averageOrderValue: orders ? Math.round(grossSales / orders) : 0,
        productViews: viewTotal,
        orderPerViewRate: viewTotal ? Number(((orders / viewTotal) * 100).toFixed(2)) : 0,
        returnRequests: returnCount,
        returnRate: orders ? Number(((returnCount / orders) * 100).toFixed(2)) : 0,
        reviewCount: Number(reviews.count || 0),
        reviewAverage: Number(Number(reviews.average || 0).toFixed(2)),
      },
      trend: this.fillTrend(range, trendRows, viewRows, refundDaily),
      statusCounts,
      topProducts,
      inventory: {
        totalSkus: Number(inventory.totalSkus || 0), availableUnits: Number(inventory.availableUnits || 0), reservedUnits: Number(inventory.reservedUnits || 0), soldUnits: Number(inventory.soldUnits || 0),
        lowStockSkus: Number(inventory.lowStockSkus || 0), outOfStockSkus: Number(inventory.outOfStockSkus || 0), retailInventoryValue: Number(inventory.retailInventoryValue || 0),
      },
      finance: {
        availableLedger: Number(finance.AVAILABLE || 0), pendingLedger: Number(finance.PENDING || 0),
        withdrawalRequested: Number(withdrawals.REQUESTED?.amount || 0), withdrawalProcessing: Number((withdrawals.APPROVED?.amount || 0) + (withdrawals.PROCESSING?.amount || 0)), totalWithdrawn: Number(withdrawals.PAID?.amount || 0),
      },
      reviews: { distribution: ratingDistribution },
      catalog: { totalProducts: products.length, activeProducts: products.filter(p => p.status === 'ACTIVE').length, lifetimeViews: products.reduce((sum, p) => sum + Number(p.viewCount || 0), 0), lifetimeSold: products.reduce((sum, p) => sum + Number(p.soldCount || 0), 0) },
    };
  }

  async admin(query: AnalyticsRangeDto) {
    const range = this.range(query);
    const masterMatch = { createdAt: { $gte: range.from, $lte: range.to }, status: { $in: SELLABLE_STATUSES } };
    const [summaryRows, trendRows, viewRows, viewTotal, feeRows, refundRows, refundDaily, statusRows, paymentRows, shopRows, productRows, activeShops, sellerCount, userCount, buyerRows, pendingProducts, openReturns, openDisputes, withdrawalQueue, inventoryAgg] = await Promise.all([
      this.orders.aggregate([{ $match: masterMatch }, { $group: { _id: null, orders: { $sum: 1 }, gmv: { $sum: '$totalAmount' }, refundedAmount: { $sum: '$refundedAmount' } } }]),
      this.orders.aggregate([{ $match: masterMatch }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, orders: { $sum: 1 }, grossSales: { $sum: '$totalAmount' } } }, { $sort: { _id: 1 } }]),
      this.events.aggregate([{ $match: { type: 'PRODUCT_VIEW', createdAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, count: { $sum: 1 } } }]),
      this.events.countDocuments({ type: 'PRODUCT_VIEW', createdAt: { $gte: range.from, $lte: range.to } }),
      this.subOrders.aggregate([{ $match: { createdAt: { $gte: range.from, $lte: range.to }, status: { $in: SELLABLE_STATUSES } } }, { $group: { _id: null, platformRevenue: { $sum: '$platformFee' }, sellerRevenue: { $sum: '$sellerRevenue' } } }]),
      this.refunds.aggregate([{ $match: { status: 'SUCCEEDED', createdAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      this.refunds.aggregate([{ $match: { status: 'SUCCEEDED', createdAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, amount: { $sum: '$amount' } } }]),
      this.orders.aggregate([{ $match: { createdAt: { $gte: range.from, $lte: range.to } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.orders.aggregate([{ $match: { createdAt: { $gte: range.from, $lte: range.to }, status: { $ne: 'CANCELLED' } } }, { $group: { _id: '$paymentMethod', orders: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }]),
      this.subOrders.aggregate([{ $match: { createdAt: { $gte: range.from, $lte: range.to }, status: { $in: SELLABLE_STATUSES } } }, { $group: { _id: '$shopId', orders: { $sum: 1 }, gmv: { $sum: { $add: ['$sellerRevenue', '$platformFee'] } }, platformFee: { $sum: '$platformFee' } } }, { $sort: { gmv: -1 } }, { $limit: 8 }]),
      this.orderItems.aggregate([{ $lookup: { from: 'suborders', localField: 'subOrderId', foreignField: '_id', as: 'sub' } }, { $addFields: { sub: { $arrayElemAt: ['$sub', 0] } } }, { $match: { 'sub.createdAt': { $gte: range.from, $lte: range.to }, 'sub.status': { $in: SELLABLE_STATUSES } } }, { $group: { _id: '$productId', name: { $first: '$productName' }, units: { $sum: '$quantity' }, revenue: { $sum: { $subtract: ['$totalPrice', { $ifNull: ['$shopVoucherDiscount', 0] }] } } } }, { $sort: { revenue: -1 } }, { $limit: 8 }]),
      this.shops.countDocuments({ status: 'ACTIVE' }),
      this.users.countDocuments({ roles: 'SELLER', status: 'ACTIVE' }),
      this.users.countDocuments({ status: 'ACTIVE' }),
      this.orders.aggregate([{ $match: masterMatch }, { $group: { _id: '$buyerId' } }, { $count: 'count' }]),
      this.products.countDocuments({ status: 'PENDING_REVIEW' }),
      this.returns.countDocuments({ status: { $in: ['REQUESTED','APPROVED','RETURN_SHIPPED','RETURN_RECEIVED','REFUND_PENDING','DISPUTED'] } }),
      this.disputes.countDocuments({ status: { $in: ['OPEN','UNDER_REVIEW'] } }),
      this.withdrawals.countDocuments({ status: { $in: ['REQUESTED','APPROVED','PROCESSING'] } }),
      this.inventories.aggregate([{ $group: { _id: null, totalSkus: { $sum: 1 }, availableUnits: { $sum: '$available' }, lowStockSkus: { $sum: { $cond: [{ $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$lowStockThreshold'] }] }, 1, 0] } }, outOfStockSkus: { $sum: { $cond: [{ $lte: ['$available', 0] }, 1, 0] } } } }]),
    ]);

    const shopIds = shopRows.map((row: any) => row._id);
    const shops = shopIds.length ? await this.shops.find({ _id: { $in: shopIds } }).select({ name: 1, slug: 1, verified: 1 }).lean<any[]>() : [];
    const shopMap = new Map(shops.map(shop => [shop._id.toString(), shop]));
    const productIds = productRows.map((row: any) => row._id);
    const productDocs = productIds.length ? await this.products.find({ _id: { $in: productIds } }).select({ slug: 1, shopId: 1 }).lean<any[]>() : [];
    const productMap = new Map(productDocs.map(product => [product._id.toString(), product]));
    const summary = summaryRows[0] || {};
    const fees = feeRows[0] || {};
    const refund = refundRows[0] || {};
    const inventory = inventoryAgg[0] || {};
    const statusCounts = Object.fromEntries(statusRows.map((row: any) => [row._id, row.count]));
    const orders = Number(summary.orders || 0);
    const gmv = Number(summary.gmv || 0);

    const topShops = shopRows.map((row: any) => {
      const shop = shopMap.get(row._id.toString());
      return { shopId: row._id.toString(), name: shop?.name || 'Unknown shop', slug: shop?.slug || '', verified: Boolean(shop?.verified), orders: row.orders, gmv: row.gmv, platformFee: row.platformFee };
    });
    const topProducts = productRows.map((row: any) => {
      const product = productMap.get(row._id.toString());
      return { productId: row._id.toString(), name: row.name, slug: product?.slug || '', shopId: product?.shopId?.toString?.() || '', units: row.units, revenue: row.revenue };
    });
    const platformRevenue = Number(fees.platformRevenue || 0);
    const refundAmount = Number(refund.amount || 0);
    const trendBase = this.fillTrend(range, trendRows, viewRows, refundDaily);
    const feeDaily = await this.subOrders.aggregate([{ $match: { createdAt: { $gte: range.from, $lte: range.to }, status: { $in: SELLABLE_STATUSES } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, platformRevenue: { $sum: '$platformFee' } } }]);
    const feeMap = new Map(feeDaily.map((row: any) => [row._id, row.platformRevenue]));

    return {
      range: { from: range.fromLabel, to: range.toLabel, days: range.days, timezone: TZ },
      kpis: {
        orders, gmv, platformRevenue, sellerRevenue: Number(fees.sellerRevenue || 0), refundAmount,
        averageOrderValue: orders ? Math.round(gmv / orders) : 0,
        productViews: viewTotal,
        orderPerViewRate: viewTotal ? Number(((orders / viewTotal) * 100).toFixed(2)) : 0,
        activeBuyers: Number(buyerRows[0]?.count || 0), activeSellers: sellerCount, activeShops, activeUsers: userCount,
        cancelRate: statusRows.reduce((sum: number, row: any) => sum + row.count, 0) ? Number((((statusCounts.CANCELLED || 0) / statusRows.reduce((sum: number, row: any) => sum + row.count, 0)) * 100).toFixed(2)) : 0,
      },
      trend: trendBase.map(row => ({ ...row, platformRevenue: Number(feeMap.get(row.date) || 0) })),
      statusCounts,
      paymentMethods: paymentRows.map((row: any) => ({ method: row._id, orders: row.orders, amount: row.amount })),
      topShops,
      topProducts,
      operations: { pendingProducts, openReturns, openDisputes, withdrawalQueue },
      inventory: { totalSkus: Number(inventory.totalSkus || 0), availableUnits: Number(inventory.availableUnits || 0), lowStockSkus: Number(inventory.lowStockSkus || 0), outOfStockSkus: Number(inventory.outOfStockSkus || 0) },
    };
  }
}
