import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './product.schema';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { ProductVariant, ProductVariantSchema } from '../variants/product-variant.schema';
import { Category, CategorySchema } from '../categories/category.schema';
import { Brand, BrandSchema } from '../brands/brand.schema';
import { Inventory, InventorySchema } from '../inventory/inventory.schema';
import { InventoryTransaction, InventoryTransactionSchema } from '../inventory/inventory-transaction.schema';
import { ProductReview, ProductReviewSchema } from './product-review.schema';
import { AnalyticsEvent, AnalyticsEventSchema } from '../analytics/analytics-event.schema';
import { StorageModule } from '../storage/storage.module';
import { AiArtworkJob, AiArtworkJobSchema, AiArtworkQuota, AiArtworkQuotaSchema } from './ai-artwork.schema';
import { AiArtworkController } from './ai-artwork.controller';
import { AiArtworkService } from './ai-artwork.service';

@Module({
  imports: [StorageModule, MongooseModule.forFeature([
    { name: AiArtworkJob.name, schema: AiArtworkJobSchema }, { name: AiArtworkQuota.name, schema: AiArtworkQuotaSchema },
    { name: Product.name, schema: ProductSchema }, { name: Shop.name, schema: ShopSchema },
    { name: ProductVariant.name, schema: ProductVariantSchema }, { name: Category.name, schema: CategorySchema },
    { name: Brand.name, schema: BrandSchema }, { name: Inventory.name, schema: InventorySchema },
    { name: InventoryTransaction.name, schema: InventoryTransactionSchema }, { name: ProductReview.name, schema: ProductReviewSchema },
    { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
  ])],
  controllers: [ProductsController, AiArtworkController], providers: [ProductsService, AiArtworkService], exports: [MongooseModule, ProductsService],
})
export class ProductsModule {}
