import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './cart.schema';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { ProductVariant, ProductVariantSchema } from '../variants/product-variant.schema';
import { Product, ProductSchema } from '../products/product.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { Inventory, InventorySchema } from '../inventory/inventory.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Cart.name, schema: CartSchema },
    { name: ProductVariant.name, schema: ProductVariantSchema },
    { name: Product.name, schema: ProductSchema },
    { name: Shop.name, schema: ShopSchema },
    { name: Inventory.name, schema: InventorySchema },
  ])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
