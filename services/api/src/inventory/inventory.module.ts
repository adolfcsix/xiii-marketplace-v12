import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Inventory, InventorySchema } from './inventory.schema';
import { InventoryTransaction, InventoryTransactionSchema } from './inventory-transaction.schema';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ProductVariant, ProductVariantSchema } from '../variants/product-variant.schema';
import { Product, ProductSchema } from '../products/product.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';

@Module({ imports: [MongooseModule.forFeature([
  { name: Inventory.name, schema: InventorySchema }, { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
  { name: ProductVariant.name, schema: ProductVariantSchema }, { name: Product.name, schema: ProductSchema }, { name: Shop.name, schema: ShopSchema },
])], controllers: [InventoryController], providers: [InventoryService], exports: [MongooseModule, InventoryService] })
export class InventoryModule {}
