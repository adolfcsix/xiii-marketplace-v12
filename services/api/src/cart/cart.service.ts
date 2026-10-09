import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart } from './cart.schema';
import { ProductVariant } from '../variants/product-variant.schema';
import { Product } from '../products/product.schema';
import { Shop } from '../shops/shop.schema';
import { Inventory } from '../inventory/inventory.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private carts: Model<Cart>,
    @InjectModel(ProductVariant.name) private variants: Model<ProductVariant>,
    @InjectModel(Product.name) private products: Model<Product>,
    @InjectModel(Shop.name) private shops: Model<Shop>,
    @InjectModel(Inventory.name) private inventories: Model<Inventory>,
  ) {}

  private async ensureCart(userId: string) {
    const filter = { userId: new Types.ObjectId(userId) };
    try {
      return await this.carts.findOneAndUpdate(
        filter, { $setOnInsert: { ...filter, items: [] } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if ((error as any)?.code !== 11000) throw error;
      return this.carts.findOne(filter);
    }
  }

  private async mutate(userId: string, change: (items: any[]) => Promise<void>) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const cart = await this.ensureCart(userId);
      if (!cart) throw new NotFoundException('CART_NOT_FOUND');
      const before = cart.toObject().items;
      const items = before.map(item => ({ ...item }));
      await change(items);
      const updated = await this.carts.updateOne(
        { _id: cart._id, items: before },
        { $set: { items }, $inc: { __v: 1 } },
        { runValidators: true },
      );
      if (updated.matchedCount === 1) return this.get(userId);
    }
    throw new ConflictException('CART_CONCURRENT_UPDATE');
  }

  private async assertPurchasable(variantId: Types.ObjectId, quantity: number) {
    const variant = await this.variants.findById(variantId).lean();
    if (!variant || variant.status !== 'ACTIVE') throw new NotFoundException('VARIANT_NOT_AVAILABLE');

    const [product, shop, inventory] = await Promise.all([
      this.products.findById(variant.productId).lean(),
      this.shops.findById(variant.shopId).lean(),
      this.inventories.findOne({ variantId }).lean(),
    ]);

    if (!product || product.status !== 'ACTIVE') throw new ConflictException('PRODUCT_NOT_AVAILABLE');
    if (!shop || shop.status !== 'ACTIVE') throw new ConflictException('SHOP_NOT_AVAILABLE');
    const available = inventory?.available ?? 0;
    if (available < quantity) throw new ConflictException('PRODUCT_OUT_OF_STOCK');
    return { variant, product, shop, inventory };
  }

  async get(userId: string) {
    const cart = await this.ensureCart(userId);
    const rawItems = (cart?.items ?? []).map((item: any) => ({
      variantId: item.variantId.toString(),
      quantity: item.quantity,
      addedAt: item.addedAt,
    }));

    if (!rawItems.length) {
      return { id: cart?._id?.toString(), shops: [], summary: { itemCount: 0, subtotal: 0, canCheckout: false } };
    }

    const variantIds = rawItems.map(i => new Types.ObjectId(i.variantId));
    const variants = await this.variants.find({ _id: { $in: variantIds } }).lean<any[]>();
    const productIds = variants.map(v => v.productId);
    const shopIds = variants.map(v => v.shopId);
    const [products, shops, inventories] = await Promise.all([
      this.products.find({ _id: { $in: productIds } }).lean<any[]>(),
      this.shops.find({ _id: { $in: shopIds } }).lean<any[]>(),
      this.inventories.find({ variantId: { $in: variantIds } }).lean<any[]>(),
    ]);

    const variantMap = new Map(variants.map(v => [v._id.toString(), v]));
    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    const shopMap = new Map(shops.map(s => [s._id.toString(), s]));
    const inventoryMap = new Map(inventories.map(i => [i.variantId.toString(), i]));
    const grouped = new Map<string, any>();
    let subtotal = 0;
    let itemCount = 0;
    let canCheckout = rawItems.length > 0;

    for (const raw of rawItems) {
      const variant = variantMap.get(raw.variantId);
      const product = variant ? productMap.get(variant.productId.toString()) : null;
      const shop = variant ? shopMap.get(variant.shopId.toString()) : null;
      const inventory = inventoryMap.get(raw.variantId);
      const available = inventory?.available ?? 0;
      const purchasable = Boolean(
        variant && variant.status === 'ACTIVE' &&
        product && product.status === 'ACTIVE' &&
        shop && shop.status === 'ACTIVE' &&
        available >= raw.quantity,
      );
      if (!purchasable) canCheckout = false;
      const lineTotal = variant ? variant.price * raw.quantity : 0;
      if (purchasable) subtotal += lineTotal;
      itemCount += raw.quantity;

      const shopKey = shop?._id?.toString() || 'unavailable';
      if (!grouped.has(shopKey)) {
        grouped.set(shopKey, {
          shop: shop ? { _id: shop._id.toString(), name: shop.name, slug: shop.slug, logo: shop.logo, verified: shop.verified } : null,
          subtotal: 0,
          items: [],
        });
      }
      const group = grouped.get(shopKey);
      if (purchasable) group.subtotal += lineTotal;
      group.items.push({
        variantId: raw.variantId,
        quantity: raw.quantity,
        addedAt: raw.addedAt,
        purchasable,
        available,
        lineTotal,
        variant: variant ? {
          _id: variant._id.toString(), sku: variant.sku, attributes: variant.attributes,
          price: variant.price, compareAtPrice: variant.compareAtPrice, image: variant.image,
        } : null,
        product: product ? {
          _id: product._id.toString(), name: product.name, slug: product.slug,
          images: product.images, shortDescription: product.shortDescription,
        } : null,
      });
    }

    return {
      id: cart?._id?.toString(),
      shops: Array.from(grouped.values()),
      summary: { itemCount, subtotal, canCheckout },
    };
  }

  async add(userId: string, variantId: Types.ObjectId, quantity: number) {
    return this.mutate(userId, async items => {
      const existing = items.find(item => item.variantId.toString() === variantId.toString());
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      if (nextQuantity > 99) throw new ConflictException('CART_ITEM_LIMIT_EXCEEDED');
      await this.assertPurchasable(variantId, nextQuantity);
      if (existing) existing.quantity = nextQuantity;
      else items.push({ variantId, quantity, addedAt: new Date() });
    });
  }

  async update(userId: string, variantId: Types.ObjectId, quantity: number) {
    return this.mutate(userId, async items => {
      const item = items.find(entry => entry.variantId.toString() === variantId.toString());
      if (!item) throw new NotFoundException('CART_ITEM_NOT_FOUND');
      await this.assertPurchasable(variantId, quantity);
      item.quantity = quantity;
    });
  }

  async remove(userId: string, variantId: Types.ObjectId) {
    await this.carts.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $pull: { items: { variantId } }, $inc: { __v: 1 } },
    );
    return this.get(userId);
  }

  async clear(userId: string) {
    await this.carts.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $set: { items: [] }, $inc: { __v: 1 } },
    );
    return { cleared: true };
  }
}
