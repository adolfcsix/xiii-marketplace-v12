import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Inventory } from './inventory.schema';
import { InventoryTransaction } from './inventory-transaction.schema';
import { ProductVariant } from '../variants/product-variant.schema';
import { Product } from '../products/product.schema';
import { Shop } from '../shops/shop.schema';
import { AdjustInventoryDto } from './inventory.dto';
import { ShopAccessService } from '../access-control/shop-access.service';

type InventoryQuery = { q?: string; stock?: 'ALL' | 'LOW' | 'OUT' | 'HEALTHY'; page?: number; limit?: number };
function escapedRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name) private inv: Model<Inventory>,
    @InjectModel(InventoryTransaction.name) private tx: Model<InventoryTransaction>,
    @InjectModel(ProductVariant.name) private variants: Model<ProductVariant>,
    @InjectModel(Product.name) private products: Model<Product>,
    @InjectModel(Shop.name) private shops: Model<Shop>,
    private shopAccess: ShopAccessService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private async shop(userId: string) {
    const access = await this.shopAccess.resolve(userId);
    const s = await this.shops.findById(access.shopId);
    if (!s) throw new NotFoundException('SHOP_NOT_FOUND');
    return s;
  }

  async owner(userId: string, variantId: Types.ObjectId) {
    const v = await this.variants.findById(variantId);
    if (!v) throw new NotFoundException('VARIANT_NOT_FOUND');
    const access = await this.shopAccess.resolve(userId);
    if (access.shopId.toString() !== v.shopId.toString()) throw new ForbiddenException('INVENTORY_OWNERSHIP_REQUIRED');
    return v;
  }

  async summary(userId: string) {
    const s = await this.shop(userId);
    const [row] = await this.inv.aggregate([
      { $match: { shopId: s._id } },
      { $group: {
        _id: null,
        skuCount: { $sum: 1 }, totalAvailable: { $sum: '$available' }, totalReserved: { $sum: '$reserved' }, totalSold: { $sum: '$sold' },
        lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$lowStockThreshold'] }] }, 1, 0] } },
        outOfStock: { $sum: { $cond: [{ $eq: ['$available', 0] }, 1, 0] } },
      } },
    ]);
    return row ? { skuCount: row.skuCount, totalAvailable: row.totalAvailable, totalReserved: row.totalReserved, totalSold: row.totalSold, lowStock: row.lowStock, outOfStock: row.outOfStock }
      : { skuCount: 0, totalAvailable: 0, totalReserved: 0, totalSold: 0, lowStock: 0, outOfStock: 0 };
  }

  async list(userId: string, query: InventoryQuery = {}) {
    const s = await this.shop(userId);
    const page = Math.max(1, query.page || 1); const limit = Math.min(100, Math.max(1, query.limit || 30));
    const baseMatch: Record<string, unknown> = { shopId: s._id };
    if (query.stock === 'OUT') baseMatch.available = 0;
    else if (query.stock === 'LOW') baseMatch.$expr = { $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$lowStockThreshold'] }] };
    else if (query.stock === 'HEALTHY') baseMatch.$expr = { $gt: ['$available', '$lowStockThreshold'] };
    const pipeline: any[] = [
      { $match: baseMatch },
      { $lookup: { from: 'productvariants', localField: 'variantId', foreignField: '_id', as: 'variantDoc' } },
      { $addFields: { variant: { $arrayElemAt: ['$variantDoc', 0] } } },
      { $match: { 'variant._id': { $exists: true } } },
      { $lookup: { from: 'products', localField: 'variant.productId', foreignField: '_id', as: 'productDoc' } },
      { $addFields: { product: { $arrayElemAt: ['$productDoc', 0] } } },
    ];
    if (query.q?.trim()) {
      const rx = new RegExp(escapedRegex(query.q.trim()), 'i');
      pipeline.push({ $match: { $or: [{ 'variant.sku': rx }, { 'product.name': rx }] } });
    }
    pipeline.push(
      { $sort: { available: 1, updatedAt: -1 } },
      { $project: {
        variantId: 1, available: 1, reserved: 1, sold: 1, lowStockThreshold: 1, updatedAt: 1,
        variant: { _id: '$variant._id', productId: '$variant.productId', sku: '$variant.sku', attributes: '$variant.attributes', price: '$variant.price', compareAtPrice: '$variant.compareAtPrice', image: '$variant.image', status: '$variant.status' },
        product: { _id: '$product._id', name: '$product.name', slug: '$product.slug', images: '$product.images', status: '$product.status' },
      } },
      { $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'count' }] } },
    );
    const [result] = await this.inv.aggregate(pipeline);
    const total = result?.total?.[0]?.count || 0;
    return { items: result?.data || [], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async adjust(userId: string, variantId: Types.ObjectId, d: AdjustInventoryDto) {
    const v = await this.owner(userId, variantId);
    const session = await this.connection.startSession();
    try {
      let result!: Inventory;
      await session.withTransaction(async () => {
        let current = await this.inv.findOne({ variantId }).session(session);
        if (!current) {
          [current] = await this.inv.create([{ variantId, shopId: v.shopId, available: 0, reserved: 0, sold: 0, lowStockThreshold: 5 }], { session });
        }
        const before = current.available;
        if (d.expectedAvailable !== undefined && d.expectedAvailable !== before) {
          throw new ConflictException('INVENTORY_CONCURRENT_UPDATE');
        }
        const update: Record<string, unknown> = { available: d.available };
        if (d.lowStockThreshold !== undefined) update.lowStockThreshold = d.lowStockThreshold;
        const changed = await this.inv.findOneAndUpdate(
          { variantId, available: before }, { $set: update }, { new: true, runValidators: true, session },
        );
        if (!changed) throw new ConflictException('INVENTORY_CONCURRENT_UPDATE');
        await this.tx.create([{
          shopId: v.shopId, variantId, type: 'ADJUSTMENT', quantity: d.available - before,
          beforeQuantity: before, afterQuantity: d.available, createdBy: new Types.ObjectId(userId), note: d.note,
        }], { session });
        result = changed;
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  async history(userId: string, variantId: Types.ObjectId) {
    await this.owner(userId, variantId);
    return this.tx.find({ variantId }).sort({ createdAt: -1 }).limit(200);
  }
}
