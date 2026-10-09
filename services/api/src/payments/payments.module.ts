import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryTransaction, InventoryTransactionSchema } from '../inventory/inventory-transaction.schema';
import { Inventory, InventorySchema } from '../inventory/inventory.schema';
import { Order, OrderItem, OrderItemSchema, OrderSchema, OrderStatusHistory, OrderStatusHistorySchema, SubOrder, SubOrderSchema } from '../orders/order.schema';
import { Voucher, VoucherSchema, VoucherUsage, VoucherUsageSchema } from '../vouchers/voucher.schema';
import { Payment, PaymentEvent, PaymentEventSchema, PaymentSchema } from './payment.schema';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AdminPaymentsController } from './admin-payments.controller';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Payment.name, schema: PaymentSchema },
    { name: PaymentEvent.name, schema: PaymentEventSchema },
    { name: Order.name, schema: OrderSchema },
    { name: SubOrder.name, schema: SubOrderSchema },
    { name: OrderItem.name, schema: OrderItemSchema },
    { name: OrderStatusHistory.name, schema: OrderStatusHistorySchema },
    { name: Inventory.name, schema: InventorySchema },
    { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    { name: Voucher.name, schema: VoucherSchema },
    { name: VoucherUsage.name, schema: VoucherUsageSchema },
  ])],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
