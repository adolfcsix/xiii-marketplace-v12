import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { ProductVariant } from './product-variant.schema';
import { Product } from '../products/product.schema';
import { Shop } from '../shops/shop.schema';
import { Inventory } from '../inventory/inventory.schema';
import { VariantDto, UpdateVariantDto } from './variants.dto';
import { ShopAccessService } from '../access-control/shop-access.service';

@Injectable()
export class VariantsService {
  constructor(
    @InjectModel(ProductVariant.name) private variants: Model<ProductVariant>,
    @InjectModel(Product.name) private products: Model<Product>,
    @InjectModel(Shop.name) private shops: Model<Shop>,
    @InjectModel(Inventory.name) private inventories: Model<Inventory>,
    private shopAccess: ShopAccessService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async ownerProduct(userId: string, productId: Types.ObjectId) {
    const p = await this.products.findById(productId);
    if (!p) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const access = await this.shopAccess.resolve(userId);
    if (access.shopId.toString() !== p.shopId.toString()) throw new ForbiddenException('PRODUCT_OWNERSHIP_REQUIRED');
    return p;
  }

  async list(productId: Types.ObjectId) {
    const product = await this.products.findOne({ _id: productId, status: 'ACTIVE' }).lean();
    if (!product || !await this.shops.exists({ _id: product.shopId, status: 'ACTIVE' })) return [];
    return this.variants.aggregate([
      { $match: { productId, status: 'ACTIVE' } }, { $sort: { createdAt: 1 } },
      { $lookup: { from: 'inventories', localField: '_id', foreignField: 'variantId', as: 'inventoryDoc' } },
      { $addFields: {
        available: { $ifNull: [{ $arrayElemAt: ['$inventoryDoc.available', 0] }, 0] },
        reserved: { $ifNull: [{ $arrayElemAt: ['$inventoryDoc.reserved', 0] }, 0] },
        sold: { $ifNull: [{ $arrayElemAt: ['$inventoryDoc.sold', 0] }, 0] },
      } }, { $project: { inventoryDoc: 0 } },
    ]);
  }

  async sellerList(userId: string, productId: Types.ObjectId) {
    await this.ownerProduct(userId, productId);
    return this.variants.aggregate([
      { $match: { productId } }, { $sort: { createdAt: 1 } },
      { $lookup: { from: 'inventories', localField: '_id', foreignField: 'variantId', as: 'inventoryDoc' } },
      { $addFields: { inventory: { $arrayElemAt: ['$inventoryDoc', 0] } } }, { $project: { inventoryDoc: 0 } },
    ]);
  }

  async create(userId: string, productId: Types.ObjectId, d: VariantDto) {
    const p = await this.ownerProduct(userId, productId);
    if (p.status === 'PENDING_REVIEW') throw new ConflictException('PRODUCT_UNDER_REVIEW');
    const sku = d.sku.trim().toUpperCase();
    if (!sku) throw new BadRequestException('SKU_REQUIRED');
    if (await this.variants.exists({ sku })) throw new ConflictException('SKU_EXISTS');
    const session = await this.connection.startSession();
    try {
      let variant!: ProductVariant;
      await session.withTransaction(async () => {
        const [created] = await this.variants.create([{ ...d, sku, productId: p._id, shopId: p.shopId }], { session });
        await this.inventories.create([{ variantId: created._id, shopId: p.shopId, available: 0, reserved: 0, sold: 0, lowStockThreshold: 5 }], { session });
        variant = created;
      });
      return variant;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new ConflictException('SKU_EXISTS');
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async update(userId: string, id: Types.ObjectId, d: UpdateVariantDto) {
    const v = await this.variants.findById(id);
    if (!v) throw new NotFoundException('VARIANT_NOT_FOUND');
    const p = await this.ownerProduct(userId, v.productId);
    if (p.status === 'PENDING_REVIEW') throw new ConflictException('PRODUCT_UNDER_REVIEW');
    if (d.sku !== undefined) {
      if (typeof d.sku !== 'string') throw new BadRequestException('SKU_REQUIRED');
      const sku = d.sku.trim().toUpperCase();
      if (!sku) throw new BadRequestException('SKU_REQUIRED');
      if (sku !== v.sku && await this.variants.exists({ sku })) throw new ConflictException('SKU_EXISTS');
      d.sku = sku;
    }
    Object.assign(v, { ...d, ...(d.compareAtPrice === null ? { compareAtPrice: undefined } : {}) });
    try {
      return await v.save();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new ConflictException('SKU_EXISTS');
      throw error;
    }
  }

  async remove(userId: string, id: Types.ObjectId) {
    const v = await this.variants.findById(id);
    if (!v) throw new NotFoundException('VARIANT_NOT_FOUND');
    const p = await this.ownerProduct(userId, v.productId);
    if (p.status === 'PENDING_REVIEW') throw new ConflictException('PRODUCT_UNDER_REVIEW');
    v.status = 'DISABLED';
    await v.save();
    return { disabled: true };
  }
}
