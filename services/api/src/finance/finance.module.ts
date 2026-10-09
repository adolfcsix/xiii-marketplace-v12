import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubOrder, SubOrderSchema } from '../orders/order.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { AdminFinanceController, SellerFinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { FinanceSetting, FinanceSettingSchema, SellerLedgerEntry, SellerLedgerEntrySchema, SellerPayoutAccount, SellerPayoutAccountSchema, WithdrawalRequest, WithdrawalRequestSchema } from './finance.schema';

@Module({
  imports:[NotificationsModule,MongooseModule.forFeature([
    {name:SellerLedgerEntry.name,schema:SellerLedgerEntrySchema},{name:SellerPayoutAccount.name,schema:SellerPayoutAccountSchema},{name:WithdrawalRequest.name,schema:WithdrawalRequestSchema},{name:FinanceSetting.name,schema:FinanceSettingSchema},{name:Shop.name,schema:ShopSchema},{name:SubOrder.name,schema:SubOrderSchema},
  ])],
  controllers:[SellerFinanceController,AdminFinanceController],providers:[FinanceService],exports:[FinanceService,MongooseModule],
})
export class FinanceModule {}
