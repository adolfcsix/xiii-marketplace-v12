import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductVariant, ProductVariantSchema } from './product-variant.schema';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';
import { Product, ProductSchema } from '../products/product.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { Inventory, InventorySchema } from '../inventory/inventory.schema';
@Module({ imports: [MongooseModule.forFeature([{ name: ProductVariant.name, schema: ProductVariantSchema }, { name: Product.name, schema: ProductSchema }, { name: Shop.name, schema: ShopSchema }, { name: Inventory.name, schema: InventorySchema }])], controllers: [VariantsController], providers: [VariantsService], exports: [MongooseModule] })
export class VariantsModule {
}

