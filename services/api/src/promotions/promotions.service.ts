import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop } from '../shops/shop.schema';
import { Product } from '../products/product.schema';
import { Voucher } from '../vouchers/voucher.schema';
import { CreateCampaignDto, CreateSellerVoucherDto, SellerPromotionQueryDto, UpdateCampaignDto, UpdateSellerVoucherDto } from './promotions.dto';
import { PromotionCampaign } from './promotion.schema';
import { ShopAccessService } from '../access-control/shop-access.service';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    @InjectModel(Product.name) private readonly products: Model<Product>,
    @InjectModel(Voucher.name) private readonly vouchers: Model<Voucher>,
    @InjectModel(PromotionCampaign.name) private readonly campaigns: Model<PromotionCampaign>,
    private readonly shopAccess: ShopAccessService,
  ) {}

  private oid(id: string) { return new Types.ObjectId(id); }
  private escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  private async sellerShop(userId: string) {
    const access = await this.shopAccess.resolve(userId, true);
    const shop = await this.shops.findById(access.shopId).lean<any>();
    if (!shop) throw new ForbiddenException('ACTIVE_SELLER_SHOP_REQUIRED');
    return shop;
  }

  private state(row: any) {
    if (!row.active || row.archivedAt) return 'DISABLED';
    const now = Date.now(); const start = new Date(row.startAt).getTime(); const end = new Date(row.endAt).getTime();
    if (start > now) return 'SCHEDULED';
    if (end < now) return 'EXPIRED';
    return 'ACTIVE';
  }

  private validateMoney(type: string, value: number, maxDiscount?: number) {
    if (type === 'PERCENT' && value > 100) throw new BadRequestException('PERCENT_VALUE_MUST_BE_1_TO_100');
    if (type === 'FIXED' && maxDiscount && maxDiscount < value) throw new BadRequestException('MAX_DISCOUNT_LESS_THAN_FIXED_VALUE');
  }

  private validateDates(startAt: string|Date, endAt: string|Date) {
    const start = new Date(startAt); const end = new Date(endAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new BadRequestException('INVALID_PROMOTION_DATE_RANGE');
    return { start, end };
  }

  private async validateProducts(shopId: Types.ObjectId, scope: string, ids: string[] = []) {
    if (scope === 'ALL_PRODUCTS') return [] as Types.ObjectId[];
    if (!ids.length) throw new BadRequestException('PROMOTION_PRODUCTS_REQUIRED');
    const unique = [...new Set(ids)];
    const objectIds = unique.map(id => this.oid(id));
    const count = await this.products.countDocuments({ _id: { $in: objectIds }, shopId });
    if (count !== objectIds.length) throw new ForbiddenException('PROMOTION_PRODUCT_OWNERSHIP_REQUIRED');
    return objectIds;
  }

  async voucherList(userId: string, q: SellerPromotionQueryDto) {
    const shop = await this.sellerShop(userId);
    const filter: any = { ownerType: 'SHOP', shopId: shop._id, archivedAt: { $exists: false } };
    if (q.q?.trim()) filter.$or = [{ code: new RegExp(this.escapeRegex(q.q.trim()), 'i') }, { name: new RegExp(this.escapeRegex(q.q.trim()), 'i') }];
    const rows = await this.vouchers.find(filter).sort({ createdAt: -1 }).lean<any[]>();
    const enriched = rows.map(row => ({ ...row, runtimeStatus: this.state(row) })).filter(row => q.status === 'ALL' || row.runtimeStatus === q.status);
    const start = (q.page - 1) * q.limit; const items = enriched.slice(start, start + q.limit);
    return { items, meta: { page: q.page, limit: q.limit, total: enriched.length, totalPages: Math.ceil(enriched.length / q.limit) } };
  }

  async createVoucher(userId: string, d: CreateSellerVoucherDto) {
    const shop = await this.sellerShop(userId); const code = d.code.trim().toUpperCase();
    if (await this.vouchers.exists({ ownerType: 'SHOP', code, archivedAt: { $exists: false } })) throw new ConflictException('SHOP_VOUCHER_CODE_EXISTS');
    this.validateMoney(d.type, d.value, d.maxDiscount); const dates = this.validateDates(d.startAt, d.endAt);
    const productIds = await this.validateProducts(shop._id, d.scope, d.productIds);
    return this.vouchers.create({ ownerType: 'SHOP', shopId: shop._id, name: d.name.trim(), code, type: d.type, value: d.value, maxDiscount: d.maxDiscount,
      minimumSpend: d.minimumSpend, quantity: d.quantity, usedCount: 0, perUserLimit: d.perUserLimit, scope: d.scope, productIds,
      startAt: dates.start, endAt: dates.end, active: d.active });
  }

  async updateVoucher(userId: string, id: Types.ObjectId, d: UpdateSellerVoucherDto) {
    const shop = await this.sellerShop(userId); const row = await this.vouchers.findOne({ _id: id, ownerType: 'SHOP', shopId: shop._id, archivedAt: { $exists: false } });
    if (!row) throw new NotFoundException('SHOP_VOUCHER_NOT_FOUND');
    const type = d.type ?? row.type; const value = d.value ?? row.value; const maxDiscount = d.maxDiscount ?? row.maxDiscount;
    this.validateMoney(type, value, maxDiscount); const dates = this.validateDates(d.startAt ?? row.startAt, d.endAt ?? row.endAt);
    const scope = d.scope ?? (row as any).scope ?? 'ALL_PRODUCTS'; const ids = d.productIds ?? ((row as any).productIds || []).map((x: any) => x.toString());
    const productIds = await this.validateProducts(shop._id, scope, ids);
    const set: any = { type, value, maxDiscount, startAt: dates.start, endAt: dates.end, scope, productIds };
    for (const key of ['name','minimumSpend','quantity','perUserLimit','active'] as const) if (d[key] !== undefined) set[key] = d[key];
    await this.vouchers.updateOne({ _id: row._id }, { $set: set });
    return this.vouchers.findById(row._id).lean();
  }

  async toggleVoucher(userId: string, id: Types.ObjectId, active: boolean) {
    const shop = await this.sellerShop(userId); const row = await this.vouchers.findOneAndUpdate({ _id: id, ownerType: 'SHOP', shopId: shop._id, archivedAt: { $exists: false } }, { $set: { active } }, { new: true }).lean();
    if (!row) throw new NotFoundException('SHOP_VOUCHER_NOT_FOUND'); return row;
  }

  async archiveVoucher(userId: string, id: Types.ObjectId) {
    const shop = await this.sellerShop(userId); const row = await this.vouchers.findOneAndUpdate({ _id: id, ownerType: 'SHOP', shopId: shop._id, archivedAt: { $exists: false } }, { $set: { active: false, archivedAt: new Date() } }, { new: true }).lean();
    if (!row) throw new NotFoundException('SHOP_VOUCHER_NOT_FOUND'); return { id: row._id, archived: true };
  }

  async campaignList(userId: string, q: SellerPromotionQueryDto) {
    const shop = await this.sellerShop(userId); const filter: any = { shopId: shop._id, archivedAt: { $exists: false } };
    if (q.q?.trim()) filter.name = new RegExp(this.escapeRegex(q.q.trim()), 'i');
    const rows = await this.campaigns.find(filter).sort({ createdAt: -1 }).lean<any[]>();
    const enriched = rows.map(row => ({ ...row, runtimeStatus: this.state(row) })).filter(row => q.status === 'ALL' || row.runtimeStatus === q.status);
    const start = (q.page - 1) * q.limit; return { items: enriched.slice(start, start + q.limit), meta: { page: q.page, limit: q.limit, total: enriched.length, totalPages: Math.ceil(enriched.length / q.limit) } };
  }

  async createCampaign(userId: string, d: CreateCampaignDto) {
    const shop = await this.sellerShop(userId); this.validateMoney(d.type, d.value, d.maxDiscount); const dates = this.validateDates(d.startAt, d.endAt);
    const productIds = await this.validateProducts(shop._id, d.scope, d.productIds);
    return this.campaigns.create({ shopId: shop._id, sellerId: this.oid(userId), name: d.name.trim(), type: d.type, value: d.value, maxDiscount: d.maxDiscount,
      scope: d.scope, productIds, startAt: dates.start, endAt: dates.end, active: d.active });
  }

  async updateCampaign(userId: string, id: Types.ObjectId, d: UpdateCampaignDto) {
    const shop = await this.sellerShop(userId); const row = await this.campaigns.findOne({ _id: id, shopId: shop._id, archivedAt: { $exists: false } });
    if (!row) throw new NotFoundException('CAMPAIGN_NOT_FOUND');
    const type = d.type ?? row.type; const value = d.value ?? row.value; const maxDiscount = d.maxDiscount ?? row.maxDiscount; this.validateMoney(type, value, maxDiscount);
    const dates = this.validateDates(d.startAt ?? row.startAt, d.endAt ?? row.endAt); const scope = d.scope ?? row.scope;
    const ids = d.productIds ?? (row.productIds || []).map(x => x.toString()); const productIds = await this.validateProducts(shop._id, scope, ids);
    const set: any = { type, value, maxDiscount, startAt: dates.start, endAt: dates.end, scope, productIds };
    for (const key of ['name','active'] as const) if (d[key] !== undefined) set[key] = d[key];
    await this.campaigns.updateOne({ _id: row._id }, { $set: set }); return this.campaigns.findById(row._id).lean();
  }

  async toggleCampaign(userId: string, id: Types.ObjectId, active: boolean) {
    const shop = await this.sellerShop(userId); const row = await this.campaigns.findOneAndUpdate({ _id: id, shopId: shop._id, archivedAt: { $exists: false } }, { $set: { active } }, { new: true }).lean();
    if (!row) throw new NotFoundException('CAMPAIGN_NOT_FOUND'); return row;
  }

  async archiveCampaign(userId: string, id: Types.ObjectId) {
    const shop = await this.sellerShop(userId); const row = await this.campaigns.findOneAndUpdate({ _id: id, shopId: shop._id, archivedAt: { $exists: false } }, { $set: { active: false, archivedAt: new Date() } }, { new: true }).lean();
    if (!row) throw new NotFoundException('CAMPAIGN_NOT_FOUND'); return { id: row._id, archived: true };
  }

  async publicShop(shopId: Types.ObjectId) {
    const shop = await this.shops.findOne({ _id: shopId, status: 'ACTIVE' }).lean(); if (!shop) throw new NotFoundException('SHOP_NOT_FOUND');
    const now = new Date(); const [vouchers, campaigns] = await Promise.all([
      this.vouchers.find({ ownerType: 'SHOP', shopId, active: true, archivedAt: { $exists: false }, startAt: { $lte: now }, endAt: { $gte: now }, $expr: { $or: [{ $eq: ['$quantity', 0] }, { $lt: ['$usedCount', '$quantity'] }] } }).sort({ minimumSpend: 1 }).lean<any[]>(),
      this.campaigns.find({ shopId, active: true, archivedAt: { $exists: false }, startAt: { $lte: now }, endAt: { $gte: now } }).sort({ createdAt: -1 }).lean<any[]>(),
    ]);
    return { vouchers: vouchers.map(v => ({ _id: v._id, name: v.name, code: v.code, type: v.type, value: v.value, maxDiscount: v.maxDiscount, minimumSpend: v.minimumSpend, perUserLimit: v.perUserLimit, scope: v.scope, productIds: v.productIds, endAt: v.endAt })),
      campaigns: campaigns.map(c => ({ _id: c._id, name: c.name, type: c.type, value: c.value, maxDiscount: c.maxDiscount, scope: c.scope, productIds: c.productIds, startAt: c.startAt, endAt: c.endAt })) };
  }
}
