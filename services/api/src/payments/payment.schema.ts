import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

export const PAYMENT_PROVIDERS = ['MOMO', 'VNPAY'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, unique: true, index: true })
  paymentCode: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ required: true, index: true })
  orderCode: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({ enum: PAYMENT_PROVIDERS, required: true, index: true })
  provider: string;

  @Prop({ required: true, index: true })
  providerOrderId: string;

  @Prop({ required: true })
  requestId: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'VND' })
  currency: string;

  @Prop({ enum: PAYMENT_STATUSES, default: 'PENDING', index: true })
  status: string;

  @Prop({ default: '' })
  payUrl: string;

  @Prop({ default: '' })
  deeplink?: string;

  @Prop({ default: '' })
  qrCodeUrl?: string;

  @Prop({ default: '' })
  providerTransactionId?: string;

  @Prop({ default: '' })
  providerResponseCode?: string;

  @Prop({ default: 0, min: 0 })
  refundedAmount: number;

  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;
}
export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ orderId: 1, createdAt: -1 });
PaymentSchema.index({ buyerId: 1, createdAt: -1 });

@Schema({ timestamps: true })
export class PaymentEvent {
  @Prop({ type: MongooseSchema.Types.ObjectId, index: true })
  paymentId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  provider: string;

  @Prop({ required: true, index: true })
  eventType: string;

  @Prop({ default: '' })
  externalId?: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: Object, default: {} })
  payload: Record<string, unknown>;
}
export const PaymentEventSchema = SchemaFactory.createForClass(PaymentEvent);
PaymentEventSchema.index({ provider: 1, externalId: 1 }, { sparse: true });
