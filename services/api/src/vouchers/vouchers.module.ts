import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Voucher, VoucherSchema, VoucherUsage, VoucherUsageSchema } from './voucher.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Voucher.name, schema: VoucherSchema },
    { name: VoucherUsage.name, schema: VoucherUsageSchema },
  ])],
  exports: [MongooseModule],
})
export class VouchersModule {}
