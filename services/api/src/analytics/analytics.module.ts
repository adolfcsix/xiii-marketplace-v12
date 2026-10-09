import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/user.schema';
import { SellerLedgerEntry, SellerLedgerEntrySchema, WithdrawalRequest, WithdrawalRequestSchema } from '../finance/finance.schema';
import { Inventory, InventorySchema } from '../inventory/inventory.schema';
import { Order, OrderItem, OrderItemSchema, OrderSchema, SubOrder, SubOrderSchema } from '../orders/order.schema';
import { Payment, PaymentSchema } from '../payments/payment.schema';
import { Product, ProductSchema } from '../products/product.schema';
import { Refund, RefundSchema, ReturnRequest, ReturnRequestSchema, Dispute, DisputeSchema } from '../returns/return.schema';
import { CustomerReview, CustomerReviewSchema } from '../reviews/customer-review.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { ProductVariant, ProductVariantSchema } from '../variants/product-variant.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEvent, AnalyticsEventSchema } from './analytics-event.schema';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
    { name: Order.name, schema: OrderSchema },
    { name: SubOrder.name, schema: SubOrderSchema },
    { name: OrderItem.name, schema: OrderItemSchema },
    { name: Product.name, schema: ProductSchema },
    { name: ProductVariant.name, schema: ProductVariantSchema },
    { name: Inventory.name, schema: InventorySchema },
    { name: Shop.name, schema: ShopSchema },
    { name: User.name, schema: UserSchema },
    { name: Payment.name, schema: PaymentSchema },
    { name: ReturnRequest.name, schema: ReturnRequestSchema },
    { name: Refund.name, schema: RefundSchema },
    { name: Dispute.name, schema: DisputeSchema },
    { name: CustomerReview.name, schema: CustomerReviewSchema },
    { name: SellerLedgerEntry.name, schema: SellerLedgerEntrySchema },
    { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
  ])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [MongooseModule, AnalyticsService],
})
export class AnalyticsModule {}
