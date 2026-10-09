import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from '../cart/cart.schema';
import { ProductVariant, ProductVariantSchema } from '../variants/product-variant.schema';
import { Product, ProductSchema } from '../products/product.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { Inventory, InventorySchema } from '../inventory/inventory.schema';
import { InventoryTransaction, InventoryTransactionSchema } from '../inventory/inventory-transaction.schema';
import { Address, AddressSchema } from '../users/address.schema';
import { Voucher, VoucherSchema, VoucherUsage, VoucherUsageSchema } from '../vouchers/voucher.schema';
import { Order, OrderItem, OrderItemSchema, OrderSchema, OrderStatusHistory, OrderStatusHistorySchema, SubOrder, SubOrderSchema } from '../orders/order.schema';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { FinanceModule } from '../finance/finance.module';
import { PromotionCampaign, PromotionCampaignSchema } from '../promotions/promotion.schema';

@Module({
  imports: [FinanceModule, MongooseModule.forFeature([
    { name: Cart.name, schema: CartSchema },
    { name: ProductVariant.name, schema: ProductVariantSchema },
    { name: Product.name, schema: ProductSchema },
    { name: Shop.name, schema: ShopSchema },
    { name: Inventory.name, schema: InventorySchema },
    { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    { name: Address.name, schema: AddressSchema },
    { name: Voucher.name, schema: VoucherSchema },
    { name: VoucherUsage.name, schema: VoucherUsageSchema },
    { name: PromotionCampaign.name, schema: PromotionCampaignSchema },
    { name: Order.name, schema: OrderSchema },
    { name: SubOrder.name, schema: SubOrderSchema },
    { name: OrderItem.name, schema: OrderItemSchema },
    { name: OrderStatusHistory.name, schema: OrderStatusHistorySchema },
  ])],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
