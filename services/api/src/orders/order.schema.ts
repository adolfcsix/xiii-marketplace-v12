import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

export const ORDER_STATUSES = [
  'PENDING_PAYMENT','PAID','CONFIRMED','PACKING','READY_TO_SHIP','SHIPPED','DELIVERED','COMPLETED',
  'CANCELLED','RETURN_REQUESTED','RETURN_APPROVED','RETURN_REJECTED','RETURNED','REFUND_PENDING','REFUNDED','DISPUTED',
] as const;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true, index: true })
  orderCode: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Object, required: true })
  shippingAddress: Record<string, unknown>;

  @Prop({ enum: ['STANDARD','EXPRESS'], default: 'STANDARD' })
  shippingMethod: string;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ min: 0 })
  originalSubtotal?: number;

  @Prop({ default: 0, min: 0 })
  campaignDiscount: number;

  @Prop({ default: 0, min: 0 })
  sellerDiscount: number;

  @Prop({ required: true, min: 0 })
  shippingFee: number;

  @Prop({ default: 0, min: 0 })
  discountAmount: number;

  @Prop({ default: 0, min: 0 })
  platformDiscount: number;

  @Prop({ default: 0, min: 0 })
  platformProductDiscount: number;

  @Prop({ default: 0, min: 0 })
  platformShippingDiscount: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ enum: ['COD','MOMO','VNPAY'], required: true })
  paymentMethod: string;

  @Prop({ enum: ['PENDING','PROCESSING','SUCCESS','FAILED','CANCELLED','PARTIALLY_REFUNDED','REFUNDED'], default: 'PENDING', index: true })
  paymentStatus: string;

  @Prop({ default: 0, min: 0 })
  refundedAmount: number;

  @Prop({ type: Date, index: true })
  paymentExpiresAt?: Date;

  @Prop({ enum: ORDER_STATUSES, required: true, index: true })
  status: string;

  @Prop()
  voucherCode?: string;

  @Prop({ type: [String], default: [] })
  shopVoucherCodes: string[];

  @Prop({ default: '' })
  cancelReason?: string;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;
}
export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ buyerId: 1, createdAt: -1 });

@Schema({ timestamps: true })
export class SubOrder {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  sellerId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  subOrderCode: string;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ min: 0 })
  originalSubtotal?: number;

  @Prop({ default: 0, min: 0 })
  campaignDiscount: number;

  @Prop({ default: 0, min: 0 })
  voucherDiscount: number;

  @Prop()
  voucherCode?: string;

  @Prop({ default: 0, min: 0 })
  shopDiscount: number;

  @Prop({ required: true, min: 0 })
  shippingFee: number;

  @Prop({ default: 0, min: 0 })
  platformFee: number;

  @Prop({ required: true })
  sellerRevenue: number;

  @Prop({ enum: ORDER_STATUSES, required: true, index: true })
  status: string;

  @Prop({ enum: ['GHN','GHTK','VIETTEL_POST','SELF','OTHER'] })
  shippingProvider?: string;

  @Prop({ default: '' })
  trackingCode?: string;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Date })
  packingAt?: Date;

  @Prop({ type: Date })
  readyToShipAt?: Date;

  @Prop({ type: Date })
  shippedAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;
}
export const SubOrderSchema = SchemaFactory.createForClass(SubOrder);
SubOrderSchema.index({ orderId: 1, shopId: 1 });

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  subOrderId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  variantId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ type: Object, default: {} })
  variantSnapshot: Record<string, unknown>;

  @Prop({ default: '' })
  image: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ min: 0 })
  originalUnitPrice?: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ default: 0, min: 0 })
  campaignDiscount: number;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  campaignId?: Types.ObjectId;

  @Prop({ default: '' })
  campaignName: string;

  @Prop({ default: 0, min: 0 })
  shopVoucherDiscount: number;

  @Prop({ default: 0, min: 0 })
  platformProductDiscount: number;

  @Prop({ min: 0 })
  buyerPaidProductAmount?: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
OrderItemSchema.index({ orderId: 1, subOrderId: 1 });

@Schema({ timestamps: true })
export class OrderStatusHistory {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, index: true })
  subOrderId?: Types.ObjectId;

  @Prop()
  fromStatus?: string;

  @Prop({ required: true })
  toStatus: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  changedBy: Types.ObjectId;

  @Prop({ default: '' })
  note: string;
}
export const OrderStatusHistorySchema = SchemaFactory.createForClass(OrderStatusHistory);
