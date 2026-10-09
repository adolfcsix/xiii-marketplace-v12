import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryTransaction, InventoryTransactionSchema } from '../inventory/inventory-transaction.schema';
import { Inventory, InventorySchema } from '../inventory/inventory.schema';
import { Order, OrderItem, OrderItemSchema, OrderSchema, OrderStatusHistory, OrderStatusHistorySchema, SubOrder, SubOrderSchema } from '../orders/order.schema';
import { Payment, PaymentSchema } from '../payments/payment.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { AdminAfterSalesController, BuyerReturnsController, SellerReturnsController } from './returns.controller';
import { Dispute, DisputeSchema, Refund, RefundSchema, ReturnRequest, ReturnRequestSchema } from './return.schema';
import { ReturnsService } from './returns.service';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports:[FinanceModule,MongooseModule.forFeature([
    {name:ReturnRequest.name,schema:ReturnRequestSchema},{name:Refund.name,schema:RefundSchema},{name:Dispute.name,schema:DisputeSchema},
    {name:Order.name,schema:OrderSchema},{name:SubOrder.name,schema:SubOrderSchema},{name:OrderItem.name,schema:OrderItemSchema},{name:OrderStatusHistory.name,schema:OrderStatusHistorySchema},
    {name:Inventory.name,schema:InventorySchema},{name:InventoryTransaction.name,schema:InventoryTransactionSchema},{name:Payment.name,schema:PaymentSchema},{name:Shop.name,schema:ShopSchema},
  ])],
  controllers:[BuyerReturnsController,SellerReturnsController,AdminAfterSalesController],providers:[ReturnsService],exports:[ReturnsService],
})
export class ReturnsModule {}
