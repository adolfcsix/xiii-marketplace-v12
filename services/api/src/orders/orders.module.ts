import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryTransaction, InventoryTransactionSchema } from '../inventory/inventory-transaction.schema';
import { Inventory, InventorySchema } from '../inventory/inventory.schema';
import { Payment, PaymentSchema } from '../payments/payment.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { Voucher, VoucherSchema, VoucherUsage, VoucherUsageSchema } from '../vouchers/voucher.schema';
import { Order, OrderItem, OrderItemSchema, OrderSchema, OrderStatusHistory, OrderStatusHistorySchema, SubOrder, SubOrderSchema } from './order.schema';
import { OrdersController } from './orders.controller';
import { SellerOrdersController } from './seller-orders.controller';
import { OrdersService } from './orders.service';
import { FinanceModule } from '../finance/finance.module';
import { User, UserSchema } from '../auth/user.schema';
import { AdminOrdersController } from './admin-orders.controller';

@Module({
  imports: [FinanceModule, MongooseModule.forFeature([
    { name: Order.name, schema: OrderSchema },
    { name: SubOrder.name, schema: SubOrderSchema },
    { name: OrderItem.name, schema: OrderItemSchema },
    { name: OrderStatusHistory.name, schema: OrderStatusHistorySchema },
    { name: Shop.name, schema: ShopSchema },
    { name: Inventory.name, schema: InventorySchema },
    { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    { name: Voucher.name, schema: VoucherSchema },
    { name: VoucherUsage.name, schema: VoucherUsageSchema },
    { name: Payment.name, schema: PaymentSchema },
    { name: User.name, schema: UserSchema },
  ])],
  controllers: [OrdersController, SellerOrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [MongooseModule, OrdersService],
})
export class OrdersModule {}
