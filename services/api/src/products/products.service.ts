import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Product } from './product.schema';
import { CreateCatalogProductDto, CreateProductDto, UpdateProductDto } from './products.dto';
import { Shop } from '../shops/shop.schema';
import { ProductVariant } from '../variants/product-variant.schema';
import { Category } from '../categories/category.schema';
import { Brand } from '../brands/brand.schema';
import { Inventory } from '../inventory/inventory.schema';
import { InventoryTransaction } from '../inventory/inventory-transaction.schema';
import { ProductReview } from './product-review.schema';
import { AnalyticsEvent } from '../analytics/analytics-event.schema';
import { toSlug } from '../common/utils/slug';
import { ShopAccessService } from '../access-control/shop-access.service';

type PublicProductQuery = {
  q?: string; category?: string; brand?: string; shop?: string; color?: string; size?: string;
  priceMin?: number; priceMax?: number; rating?: number;
  sort?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc'; page?: number; limit?: number;
};
type SellerProductQuery = { q?: string; status?: string; page?: number; limit?: number };
type AdminProductQuery = { q?: string; status?: string; page?: number; limit?: number };

function escapedRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private products: Model<Product>,
    @InjectModel(Shop.name) private shops: Model<Shop>,
    @InjectModel(ProductVariant.name) private variants: Model<ProductVariant>,
    @InjectModel(Category.name) private categories: Model<Category>,
    @InjectModel(Brand.name) private brands: Model<Brand>,
    @InjectModel(Inventory.name) private inventories: Model<Inventory>,
    @InjectModel(InventoryTransaction.name) private inventoryTransactions: Model<InventoryTransaction>,
    @InjectModel(ProductReview.name) private reviews: Model<ProductReview>,
    @InjectModel(AnalyticsEvent.name) private analyticsEvents: Model<AnalyticsEvent>,
    @InjectConnection() private connection: Connection,
    private shopAccess: ShopAccessService,
  ) {}

  async list(query: PublicProductQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 24));
    const productFilter: Record<string, unknown> = { status: 'ACTIVE' };
    const saleOnly = query.q?.trim().toLowerCase() === 'sale';
    if (query.q?.trim() && !saleOnly) {
      const tokens = query.q.trim().split(/\s+/).map(v => v.trim()).filter(v => v.length >= 2).slice(0, 6);
      const regexes = (tokens.length ? tokens : [query.q.trim()]).map(v => new RegExp(escapedRegex(v), 'i'));
      productFilter.$or = regexes.flatMap(rx => [{ name: rx }, { shortDescription: rx }, { description: rx }]);
    }
    if (query.rating !== undefined) productFilter.ratingAverage = { $gte: query.rating };
    if (query.category) {
      const category = Types.ObjectId.isValid(query.category)
        ? await this.categories.findById(query.category)
        : await this.categories.findOne({ slug: query.category, active: true });
      if (!category) return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
      productFilter.categoryId = category._id;
    }
    if (query.brand) {
      const brand = Types.ObjectId.isValid(query.brand)
        ? await this.brands.findById(query.brand)
        : await this.brands.findOne({ slug: query.brand, active: true });
      if (!brand) return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
      productFilter.brandId = brand._id;
    }
    if (query.shop) {
      const shop = await this.shops.findOne(Types.ObjectId.isValid(query.shop)
        ? { _id: new Types.ObjectId(query.shop), status: 'ACTIVE' }
        : { slug: query.shop, status: 'ACTIVE' });
      if (!shop) return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
      productFilter.shopId = shop._id;
    }
    const variantMatch: Record<string, unknown> = { status: 'ACTIVE' };
    if (saleOnly) variantMatch.$and = [{ $expr: { $gt: ['$compareAtPrice', '$price'] } }];
    if (query.color) variantMatch['attributes.color'] = new RegExp(`^${escapedRegex(query.color)}$`, 'i');
    if (query.size) variantMatch['attributes.size'] = new RegExp(`^${escapedRegex(query.size)}$`, 'i');
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      const price: Record<string, number> = {};
      if (query.priceMin !== undefined) price.$gte = query.priceMin;
      if (query.priceMax !== undefined) price.$lte = query.priceMax;
      variantMatch.price = price;
    }
    const sort: Record<string, 1 | -1> = query.sort === 'newest' ? { createdAt: -1 }
      : query.sort === 'rating' ? { ratingAverage: -1, ratingCount: -1 }
      : query.sort === 'price_asc' ? { minPrice: 1 }
      : query.sort === 'price_desc' ? { minPrice: -1 }
      : { soldCount: -1, ratingAverage: -1 };
    const pipeline: any[] = [
      { $match: productFilter },
      { $lookup: { from: 'productvariants', let: { pid: '$_id' }, pipeline: [
        { $match: { $expr: { $eq: ['$productId', '$$pid'] }, ...variantMatch } }, { $sort: { price: 1 } },
      ], as: 'variants' } },
      { $match: { 'variants.0': { $exists: true } } },
      { $addFields: { primaryVariant: { $arrayElemAt: ['$variants', 0] }, minPrice: { $min: '$variants.price' } } },
      { $sort: sort },
      { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'categoryDoc' } },
      { $lookup: { from: 'brands', localField: 'brandId', foreignField: '_id', as: 'brandDoc' } },
      { $lookup: { from: 'shops', localField: 'shopId', foreignField: '_id', as: 'shopDoc' } },
      { $match: { 'shopDoc.status': 'ACTIVE' } },
      { $project: {
        shopId: 1, categoryId: 1, brandId: 1, name: 1, slug: 1, shortDescription: 1, description: 1,
        images: 1, attributes: 1, ratingAverage: 1, ratingCount: 1, soldCount: 1, viewCount: 1, createdAt: 1,
        minPrice: 1, primaryVariant: 1,
        category: { $let: { vars: { c: { $arrayElemAt: ['$categoryDoc', 0] } }, in: { _id: '$$c._id', name: '$$c.name', slug: '$$c.slug' } } },
        brand: { $let: { vars: { b: { $arrayElemAt: ['$brandDoc', 0] } }, in: { _id: '$$b._id', name: '$$b.name', slug: '$$b.slug' } } },
        shop: { $let: { vars: { s: { $arrayElemAt: ['$shopDoc', 0] } }, in: { _id: '$$s._id', name: '$$s.name', slug: '$$s.slug', verified: '$$s.verified' } } },
      } },
      { $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'count' }] } },
    ];
    const [result] = await this.products.aggregate(pipeline);
    const total = result?.total?.[0]?.count || 0;
    return { data: result?.data || [], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async one(slug: string) {
    const p = await this.products.findOneAndUpdate({ slug, status: 'ACTIVE' }, { $inc: { viewCount: 1 } }, { new: true }).lean();
    if (!p) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const [shop, category, brand] = await Promise.all([
      this.shops.findById(p.shopId).lean(), this.categories.findById(p.categoryId).lean(),
      p.brandId ? this.brands.findById(p.brandId).lean() : Promise.resolve(null),
      this.analyticsEvents.create({ type: 'PRODUCT_VIEW', shopId: p.shopId, productId: p._id, metadata: { source: 'PRODUCT_DETAIL' } }).catch(() => null),
    ]);
    if (!shop || shop.status !== 'ACTIVE') throw new NotFoundException('PRODUCT_NOT_FOUND');
    return {
      ...p,
      shop: shop ? { _id: shop._id, name: shop.name, slug: shop.slug, logo: shop.logo, banner: shop.banner, description: shop.description, verified: shop.verified, ratingAverage: shop.ratingAverage, ratingCount: shop.ratingCount, followerCount: shop.followerCount, productCount: shop.productCount, responseRate: shop.responseRate, address: shop.address } : null,
      category: category ? { _id: category._id, name: category.name, slug: category.slug } : null,
      brand: brand ? { _id: brand._id, name: brand.name, slug: brand.slug, logo: brand.logo, verified: brand.verified } : null,
    };
  }

  private async sellerShop(userId: string, activeOnly = false) {
    const access = await this.shopAccess.resolve(userId, activeOnly);
    const shop = await this.shops.findById(access.shopId);
    if (!shop) throw new NotFoundException('SHOP_NOT_FOUND');
    return shop;
  }

  async sellerList(userId: string, query: SellerProductQuery = {}) {
    const shop = await this.sellerShop(userId);
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const match: Record<string, unknown> = { shopId: shop._id };
    if (query.status && query.status !== 'ALL') match.status = query.status;
    if (query.q?.trim()) {
      const rx = new RegExp(escapedRegex(query.q.trim()), 'i');
      match.$or = [{ name: rx }, { slug: rx }];
    }
    const [result] = await this.products.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'productvariants', localField: '_id', foreignField: 'productId', as: 'variants' } },
      { $lookup: { from: 'inventories', let: { variantIds: '$variants._id' }, pipeline: [
        { $match: { $expr: { $in: ['$variantId', '$$variantIds'] } } },
      ], as: 'inventories' } },
      { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'categoryDoc' } },
      { $lookup: { from: 'brands', localField: 'brandId', foreignField: '_id', as: 'brandDoc' } },
      { $addFields: {
        activeVariants: { $filter: { input: '$variants', as: 'v', cond: { $eq: ['$$v.status', 'ACTIVE'] } } },
        availableStock: { $sum: '$inventories.available' }, reservedStock: { $sum: '$inventories.reserved' }, soldStock: { $sum: '$inventories.sold' },
        lowStockCount: { $size: { $filter: { input: '$inventories', as: 'i', cond: { $and: [{ $gt: ['$$i.available', 0] }, { $lte: ['$$i.available', '$$i.lowStockThreshold'] }] } } } },
      } },
      { $project: {
        name: 1, slug: 1, status: 1, images: 1, shortDescription: 1, ratingAverage: 1, ratingCount: 1, soldCount: 1, viewCount: 1, createdAt: 1, updatedAt: 1, submittedForReviewAt: 1, reviewedAt: 1, rejectionReason: 1,
        variantCount: { $size: '$variants' }, activeVariantCount: { $size: '$activeVariants' },
        minPrice: { $min: '$activeVariants.price' }, maxPrice: { $max: '$activeVariants.price' }, availableStock: 1, reservedStock: 1, soldStock: 1, lowStockCount: 1,
        category: { $let: { vars: { c: { $arrayElemAt: ['$categoryDoc', 0] } }, in: { _id: '$$c._id', name: '$$c.name', slug: '$$c.slug' } } },
        brand: { $let: { vars: { b: { $arrayElemAt: ['$brandDoc', 0] } }, in: { _id: '$$b._id', name: '$$b.name', slug: '$$b.slug' } } },
      } },
      { $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'count' }] } },
    ]);
    const total = result?.total?.[0]?.count || 0;
    return { items: result?.data || [], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async sellerSummary(userId: string) {
    const shop = await this.sellerShop(userId);
    const rows = await this.products.aggregate([
      { $match: { shopId: shop._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts: Record<string, number> = { DRAFT: 0, PENDING_REVIEW: 0, ACTIVE: 0, REJECTED: 0, HIDDEN: 0 };
    for (const row of rows) counts[row._id] = row.count;
    const [stock] = await this.inventories.aggregate([
      { $match: { shopId: shop._id } },
      { $group: { _id: null, totalAvailable: { $sum: '$available' }, lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$lowStockThreshold'] }] }, 1, 0] } }, outOfStock: { $sum: { $cond: [{ $eq: ['$available', 0] }, 1, 0] } } } },
    ]);
    return { total: Object.values(counts).reduce((a, b) => a + b, 0), counts, totalAvailable: stock?.totalAvailable || 0, lowStock: stock?.lowStock || 0, outOfStock: stock?.outOfStock || 0 };
  }

  async sellerOne(userId: string, id: Types.ObjectId) {
    const shop = await this.sellerShop(userId);
    const product = await this.products.findOne({ _id: id, shopId: shop._id }).lean();
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const [category, brand, variants] = await Promise.all([
      this.categories.findById(product.categoryId).lean(),
      product.brandId ? this.brands.findById(product.brandId).lean() : Promise.resolve(null),
      this.variants.aggregate([
        { $match: { productId: id } }, { $sort: { createdAt: 1 } },
        { $lookup: { from: 'inventories', localField: '_id', foreignField: 'variantId', as: 'inventoryDoc' } },
        { $addFields: { inventory: { $arrayElemAt: ['$inventoryDoc', 0] } } },
        { $project: { inventoryDoc: 0 } },
      ]),
    ]);
    return { ...product, category, brand, variants };
  }

  private async validateRefs(categoryId: string, brandId?: string | null) {
    if (!Types.ObjectId.isValid(categoryId)) throw new BadRequestException('INVALID_CATEGORY_ID');
    const category = await this.categories.findOne({ _id: categoryId, active: true });
    if (!category) throw new BadRequestException('CATEGORY_NOT_FOUND');
    if (brandId) {
      if (!Types.ObjectId.isValid(brandId)) throw new BadRequestException('INVALID_BRAND_ID');
      const brand = await this.brands.findOne({ _id: brandId, active: true });
      if (!brand) throw new BadRequestException('BRAND_NOT_FOUND');
    }
  }

  private async uniqueSlug(name: string) {
    const base = toSlug(name) || 'product'; let slug = base; let n = 1;
    while (await this.products.exists({ slug })) slug = `${base}-${n++}`;
    return slug;
  }

  async create(userId: string, d: CreateProductDto) {
    const shop = await this.sellerShop(userId, true);
    await this.validateRefs(d.categoryId, d.brandId);
    const slug = await this.uniqueSlug(d.name);
    const p = await this.products.create({ ...d, shopId: shop._id, categoryId: new Types.ObjectId(d.categoryId), brandId: d.brandId ? new Types.ObjectId(d.brandId) : undefined, slug, status: 'DRAFT' });
    await this.shops.updateOne({ _id: shop._id }, { $inc: { productCount: 1 } });
    return p;
  }

  async createCatalog(userId: string, d: CreateCatalogProductDto) {
    const shop = await this.sellerShop(userId, true);
    await this.validateRefs(d.product.categoryId, d.product.brandId);
    if (!d.variants.length) throw new BadRequestException('AT_LEAST_ONE_VARIANT_REQUIRED');
    const normalizedSkus = d.variants.map(v => v.sku.trim().toUpperCase());
    if (normalizedSkus.some(sku => !sku)) throw new BadRequestException('SKU_REQUIRED');
    if (new Set(normalizedSkus).size !== normalizedSkus.length) throw new ConflictException('DUPLICATE_SKU_IN_REQUEST');
    if (await this.variants.exists({ sku: { $in: normalizedSkus } })) throw new ConflictException('SKU_EXISTS');
    const slug = await this.uniqueSlug(d.product.name);
    const session = await this.connection.startSession();
    try {
      let productId!: Types.ObjectId;
      await session.withTransaction(async () => {
        const [product] = await this.products.create([{
          ...d.product, shopId: shop._id, categoryId: new Types.ObjectId(d.product.categoryId),
          brandId: d.product.brandId ? new Types.ObjectId(d.product.brandId) : undefined,
          slug, status: d.submitForReview ? 'PENDING_REVIEW' : 'DRAFT',
          submittedForReviewAt: d.submitForReview ? new Date() : undefined,
          rejectionReason: '',
        }], { session });
        productId = product._id;
        if (d.submitForReview) await this.reviews.create([{
          productId: product._id, shopId: shop._id, action: 'SUBMITTED', actorId: new Types.ObjectId(userId), note: 'Seller gửi sản phẩm duyệt',
        }], { session });
        for (let index = 0; index < d.variants.length; index++) {
          const row = d.variants[index];
          const [variant] = await this.variants.create([{
            productId: product._id, shopId: shop._id, sku: normalizedSkus[index], attributes: row.attributes,
            price: row.price, compareAtPrice: row.compareAtPrice, weight: row.weight || 0, image: row.image || '', status: 'ACTIVE',
          }], { session });
          const available = row.initialAvailable || 0;
          const [inventory] = await this.inventories.create([{
            variantId: variant._id, shopId: shop._id, available, reserved: 0, sold: 0, lowStockThreshold: row.lowStockThreshold ?? 5,
          }], { session });
          if (available > 0) await this.inventoryTransactions.create([{
            shopId: shop._id, variantId: variant._id, type: 'IMPORT', quantity: available,
            beforeQuantity: 0, afterQuantity: inventory.available, createdBy: new Types.ObjectId(userId), note: 'Tồn kho ban đầu khi tạo sản phẩm',
          }], { session });
        }
        await this.shops.updateOne({ _id: shop._id }, { $inc: { productCount: 1 } }, { session });
      });
      return this.sellerOne(userId, productId);
    } finally { await session.endSession(); }
  }

  async update(userId: string, id: Types.ObjectId, d: UpdateProductDto) {
    const p = await this.products.findById(id);
    if (!p) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const access = await this.shopAccess.resolve(userId);
    const shop = access.shopId.toString() === p.shopId.toString() ? await this.shops.findById(access.shopId) : null;
    if (!shop) throw new ForbiddenException('PRODUCT_OWNERSHIP_REQUIRED');
    const contentEdit = d.categoryId !== undefined || d.brandId !== undefined || d.name !== undefined || d.shortDescription !== undefined || d.description !== undefined || d.images !== undefined || d.attributes !== undefined;
    if (p.status === 'PENDING_REVIEW' && contentEdit) throw new ConflictException('PRODUCT_UNDER_REVIEW');
    if (d.categoryId !== undefined || d.brandId !== undefined) await this.validateRefs(
      d.categoryId ?? p.categoryId.toString(), d.brandId === undefined ? p.brandId?.toString() : d.brandId,
    );
    const previousStatus = p.status;
    const autoReviewAfterActiveEdit = previousStatus === 'ACTIVE' && contentEdit && d.status === undefined;
    if (d.status === 'PENDING_REVIEW') {
      if (!['DRAFT', 'REJECTED'].includes(p.status)) throw new ConflictException('INVALID_REVIEW_TRANSITION');
      const count = await this.variants.countDocuments({ productId: p._id, status: 'ACTIVE' });
      if (!count) throw new BadRequestException('ACTIVE_VARIANT_REQUIRED');
      if (shop.status !== 'ACTIVE') throw new ConflictException('SHOP_NOT_ACTIVE');
      p.submittedForReviewAt = new Date();
      p.reviewedAt = undefined;
      p.reviewedBy = undefined;
      p.rejectionReason = '';
    }
    if (d.status === 'DRAFT' && p.status !== 'PENDING_REVIEW') throw new ConflictException('INVALID_DRAFT_TRANSITION');
    if (d.status === 'HIDDEN' && p.status === 'PENDING_REVIEW') {
      p.reviewedAt = undefined;
      p.reviewedBy = undefined;
    }
    if (autoReviewAfterActiveEdit) {
      const count = await this.variants.countDocuments({ productId: p._id, status: 'ACTIVE' });
      if (!count) throw new BadRequestException('ACTIVE_VARIANT_REQUIRED');
      p.submittedForReviewAt = new Date(); p.reviewedAt = undefined; p.reviewedBy = undefined; p.rejectionReason = '';
    }
    const scalar: Partial<Product> = {};
    if (d.name !== undefined) scalar.name = d.name;
    if (d.shortDescription !== undefined) scalar.shortDescription = d.shortDescription;
    if (d.description !== undefined) scalar.description = d.description;
    if (d.images !== undefined) scalar.images = d.images;
    if (d.attributes !== undefined) scalar.attributes = d.attributes;
    if (d.status !== undefined) scalar.status = d.status;
    else if (autoReviewAfterActiveEdit) scalar.status = 'PENDING_REVIEW';
    Object.assign(p, scalar);
    if (d.categoryId) p.categoryId = new Types.ObjectId(d.categoryId);
    if (d.brandId !== undefined) p.brandId = d.brandId ? new Types.ObjectId(d.brandId) : undefined;
    // Product URLs remain stable when content is edited; saved outfits use the slug.
    await p.save();
    if ((d.status === 'PENDING_REVIEW' && previousStatus !== 'PENDING_REVIEW') || autoReviewAfterActiveEdit) {
      await this.reviews.create({ productId: p._id, shopId: p.shopId, action: 'SUBMITTED', actorId: new Types.ObjectId(userId), note: autoReviewAfterActiveEdit ? 'Seller chỉnh sửa nội dung sản phẩm đang bán; tự động gửi duyệt lại' : previousStatus === 'REJECTED' ? 'Seller chỉnh sửa và gửi duyệt lại' : 'Seller gửi sản phẩm duyệt' });
    } else if (d.status === 'DRAFT' && previousStatus === 'PENDING_REVIEW') {
      await this.reviews.create({ productId: p._id, shopId: p.shopId, action: 'WITHDRAWN', actorId: new Types.ObjectId(userId), note: 'Seller rút sản phẩm khỏi hàng chờ duyệt' });
    }
    return p;
  }

  async remove(userId: string, id: Types.ObjectId) {
    const p = await this.products.findById(id);
    if (!p) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const access = await this.shopAccess.resolve(userId);
    const shop = access.shopId.toString() === p.shopId.toString() ? await this.shops.findById(access.shopId) : null;
    if (!shop) throw new ForbiddenException('PRODUCT_OWNERSHIP_REQUIRED');
    if (p.status === 'HIDDEN') return { hidden: true };
    const wasPending = p.status === 'PENDING_REVIEW';
    p.status = 'HIDDEN';
    await p.save();
    if (wasPending) await this.reviews.create({ productId: p._id, shopId: p.shopId, action: 'WITHDRAWN', actorId: new Types.ObjectId(userId), note: 'Seller ẩn sản phẩm trong lúc chờ duyệt' });
    return { hidden: true };
  }

  async adminSummary() {
    const rows = await this.products.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const counts: Record<string, number> = { DRAFT: 0, PENDING_REVIEW: 0, ACTIVE: 0, REJECTED: 0, HIDDEN: 0 };
    for (const row of rows) counts[row._id] = row.count;
    const oldest = await this.products.findOne({ status: 'PENDING_REVIEW' }).sort({ submittedForReviewAt: 1, createdAt: 1 }).select({ submittedForReviewAt: 1, createdAt: 1 }).lean();
    const anchor = oldest?.submittedForReviewAt || (oldest as any)?.createdAt;
    return {
      total: Object.values(counts).reduce((a, b) => a + b, 0), counts,
      pending: counts.PENDING_REVIEW, oldestPendingHours: anchor ? Math.max(0, Math.floor((Date.now() - new Date(anchor).getTime()) / 3600000)) : 0,
    };
  }

  async adminList(query: AdminProductQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const match: Record<string, unknown> = {};
    if (query.status && query.status !== 'ALL') match.status = query.status;
    if (query.q?.trim()) {
      const rx = new RegExp(escapedRegex(query.q.trim()), 'i');
      match.$or = [{ name: rx }, { slug: rx }, { shortDescription: rx }];
    }
    const [result] = await this.products.aggregate([
      { $match: match },
      { $sort: query.status === 'PENDING_REVIEW' || !query.status ? { submittedForReviewAt: 1, createdAt: 1 } : { updatedAt: -1 } },
      { $lookup: { from: 'shops', localField: 'shopId', foreignField: '_id', as: 'shopDoc' } },
      { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'categoryDoc' } },
      { $lookup: { from: 'brands', localField: 'brandId', foreignField: '_id', as: 'brandDoc' } },
      { $lookup: { from: 'productvariants', localField: '_id', foreignField: 'productId', as: 'variants' } },
      { $lookup: { from: 'inventories', let: { ids: '$variants._id' }, pipeline: [{ $match: { $expr: { $in: ['$variantId', '$$ids'] } } }], as: 'inventories' } },
      { $addFields: { activeVariants: { $filter: { input: '$variants', as: 'v', cond: { $eq: ['$$v.status', 'ACTIVE'] } } } } },
      { $project: {
        name: 1, slug: 1, status: 1, images: 1, shortDescription: 1, submittedForReviewAt: 1, reviewedAt: 1, rejectionReason: 1, createdAt: 1, updatedAt: 1,
        variantCount: { $size: '$variants' }, activeVariantCount: { $size: '$activeVariants' }, minPrice: { $min: '$activeVariants.price' }, maxPrice: { $max: '$activeVariants.price' }, availableStock: { $sum: '$inventories.available' },
        shop: { $let: { vars: { s: { $arrayElemAt: ['$shopDoc', 0] } }, in: { _id: '$$s._id', name: '$$s.name', slug: '$$s.slug', status: '$$s.status', verified: '$$s.verified' } } },
        category: { $let: { vars: { c: { $arrayElemAt: ['$categoryDoc', 0] } }, in: { _id: '$$c._id', name: '$$c.name', slug: '$$c.slug' } } },
        brand: { $let: { vars: { b: { $arrayElemAt: ['$brandDoc', 0] } }, in: { _id: '$$b._id', name: '$$b.name', slug: '$$b.slug' } } },
      } },
      { $facet: { items: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'count' }] } },
    ]);
    const total = result?.total?.[0]?.count || 0;
    return { items: result?.items || [], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async adminOne(id: Types.ObjectId) {
    const product = await this.products.findById(id).lean();
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const [shop, category, brand, variants, reviewHistory] = await Promise.all([
      this.shops.findById(product.shopId).lean(),
      this.categories.findById(product.categoryId).lean(),
      product.brandId ? this.brands.findById(product.brandId).lean() : Promise.resolve(null),
      this.variants.aggregate([
        { $match: { productId: id } }, { $sort: { createdAt: 1 } },
        { $lookup: { from: 'inventories', localField: '_id', foreignField: 'variantId', as: 'inventoryDoc' } },
        { $addFields: { inventory: { $arrayElemAt: ['$inventoryDoc', 0] } } }, { $project: { inventoryDoc: 0 } },
      ]),
      this.reviews.aggregate([
        { $match: { productId: id } }, { $sort: { createdAt: -1 } },
        { $lookup: { from: 'users', localField: 'actorId', foreignField: '_id', as: 'actorDoc' } },
        { $addFields: { actor: { $let: { vars: { a: { $arrayElemAt: ['$actorDoc', 0] } }, in: { _id: '$$a._id', fullName: '$$a.fullName', email: '$$a.email', roles: '$$a.roles' } } } } },
        { $project: { actorDoc: 0 } },
      ]),
    ]);
    return { ...product, shop, category, brand, variants, reviewHistory };
  }

  private async validateAdminApproval(product: any) {
    const [shop, category, activeVariants] = await Promise.all([
      this.shops.findOne({ _id: product.shopId, status: 'ACTIVE' }),
      this.categories.findOne({ _id: product.categoryId, active: true }),
      this.variants.countDocuments({ productId: product._id, status: 'ACTIVE' }),
    ]);
    if (!shop) throw new ConflictException('SHOP_NOT_ACTIVE');
    if (!category) throw new ConflictException('CATEGORY_NOT_ACTIVE');
    if (!activeVariants) throw new ConflictException('ACTIVE_VARIANT_REQUIRED');
  }

  async adminApprove(adminId: string, id: Types.ObjectId, note?: string) {
    const session = await this.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const product = await this.products.findOne({ _id: id, status: 'PENDING_REVIEW' }).session(session);
        if (!product) throw new ConflictException('PRODUCT_NOT_PENDING_REVIEW');
        await this.validateAdminApproval(product);
        product.status = 'ACTIVE'; product.reviewedAt = new Date(); product.reviewedBy = new Types.ObjectId(adminId); product.rejectionReason = '';
        await product.save({ session });
        await this.reviews.create([{ productId: product._id, shopId: product.shopId, action: 'APPROVED', actorId: new Types.ObjectId(adminId), note: note?.trim() || 'Admin duyệt sản phẩm' }], { session });
        result = product.toObject();
      });
      return result;
    } finally { await session.endSession(); }
  }

  async adminReject(adminId: string, id: Types.ObjectId, reason: string) {
    const clean = reason.trim();
    if (clean.length < 5) throw new BadRequestException('REJECTION_REASON_TOO_SHORT');
    const session = await this.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const product = await this.products.findOne({ _id: id, status: 'PENDING_REVIEW' }).session(session);
        if (!product) throw new ConflictException('PRODUCT_NOT_PENDING_REVIEW');
        product.status = 'REJECTED'; product.reviewedAt = new Date(); product.reviewedBy = new Types.ObjectId(adminId); product.rejectionReason = clean;
        await product.save({ session });
        await this.reviews.create([{ productId: product._id, shopId: product.shopId, action: 'REJECTED', actorId: new Types.ObjectId(adminId), note: clean }], { session });
        result = product.toObject();
      });
      return result;
    } finally { await session.endSession(); }
  }

}
