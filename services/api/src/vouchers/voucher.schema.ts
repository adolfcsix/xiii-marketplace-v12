import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ enum: ['PLATFORM', 'SHOP'], default: 'PLATFORM', index: true })
  ownerType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, index: true })
  shopId?: Types.ObjectId;

  @Prop({ default: '', trim: true })
  name: string;

  @Prop({ required: true, uppercase: true, trim: true, index: true })
  code: string;

  @Prop({ enum: ['FIXED', 'PERCENT', 'FREE_SHIPPING'], required: true })
  type: string;

  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({ min: 0 })
  maxDiscount?: number;

  @Prop({ default: 0, min: 0 })
  minimumSpend: number;

  @Prop({ default: 0, min: 0 })
  quantity: number;

  @Prop({ default: 0, min: 0 })
  usedCount: number;

  @Prop({ default: 1, min: 1 })
  perUserLimit: number;

  @Prop({ enum: ['ALL_PRODUCTS', 'SELECTED_PRODUCTS'], default: 'ALL_PRODUCTS' })
  scope: string;

  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  productIds: Types.ObjectId[];

  @Prop({ type: Date, required: true })
  startAt: Date;

  @Prop({ type: Date, required: true })
  endAt: Date;

  @Prop({ default: true, index: true })
  active: boolean;

  @Prop({ type: Date })
  archivedAt?: Date;
}
export const VoucherSchema = SchemaFactory.createForClass(Voucher);
VoucherSchema.index({ ownerType: 1, shopId: 1, code: 1, active: 1 });

@Schema({ timestamps: true })
export class VoucherUsage {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  voucherId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amountSaved: number;

  @Prop({ type: Date, default: Date.now })
  usedAt: Date;
}
export const VoucherUsageSchema = SchemaFactory.createForClass(VoucherUsage);
VoucherUsageSchema.index({ voucherId: 1, userId: 1 });
