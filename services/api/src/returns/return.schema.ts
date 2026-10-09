import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

export const RETURN_REASONS = ['DAMAGED','WRONG_ITEM','NOT_AS_DESCRIBED','MISSING_ITEM','SIZE_FIT','OTHER'] as const;
export const RETURN_STATUSES = ['REQUESTED','APPROVED','REJECTED','RETURN_SHIPPED','RETURN_RECEIVED','REFUND_PENDING','REFUNDED','DISPUTED','CLOSED'] as const;
export const REFUND_STATUSES = ['PENDING','PROCESSING','SUCCEEDED','FAILED'] as const;
export const DISPUTE_STATUSES = ['OPEN','UNDER_REVIEW','RESOLVED_BUYER','RESOLVED_SELLER','CLOSED'] as const;

@Schema({ _id: false })
export class ReturnLine {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) orderItemId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) variantId: Types.ObjectId;
  @Prop({ required: true }) productName: string;
  @Prop({ default: '' }) image: string;
  @Prop({ type: Object, default: {} }) variantSnapshot: Record<string, unknown>;
  @Prop({ required: true, min: 1 }) quantity: number;
  @Prop({ required: true, min: 0 }) unitPrice: number;
  @Prop({ required: true, min: 0 }) grossAmount: number;
  @Prop({ required: true, min: 0 }) refundableAmount: number;
  @Prop({ required: true, min: 0 }) sellerLiabilityAmount: number;
}
export const ReturnLineSchema = SchemaFactory.createForClass(ReturnLine);

@Schema({ timestamps: true })
export class ReturnRequest {
  @Prop({ required: true, unique: true, index: true }) requestCode: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) orderId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) subOrderId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) buyerId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) shopId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) sellerId: Types.ObjectId;
  @Prop({ required: true, index: true }) orderCode: string;
  @Prop({ required: true, index: true }) subOrderCode: string;
  @Prop({ enum: RETURN_REASONS, required: true }) reason: string;
  @Prop({ default: '' }) detail: string;
  @Prop({ type: [String], default: [] }) evidenceUrls: string[];
  @Prop({ type: [ReturnLineSchema], required: true, default: [] }) items: ReturnLine[];
  @Prop({ required: true, min: 0 }) grossAmount: number;
  @Prop({ required: true, min: 0 }) refundAmount: number;
  @Prop({ required: true, min: 0, default: 0 }) sellerLiabilityAmount: number;
  @Prop({ default: false }) fullSubOrderReturn: boolean;
  @Prop({ enum: RETURN_STATUSES, default: 'REQUESTED', index: true }) status: string;
  @Prop({ required: true }) sourceSubOrderStatus: string;
  @Prop({ default: '' }) sellerNote: string;
  @Prop({ default: '' }) rejectionReason: string;
  @Prop({ default: '' }) decisionSource: string;
  @Prop({ default: '' }) returnShippingProvider: string;
  @Prop({ default: '' }) returnTrackingCode: string;
  @Prop({ type: Date, default: Date.now }) requestedAt: Date;
  @Prop({ type: Date }) decidedAt?: Date;
  @Prop({ type: Date }) returnShippedAt?: Date;
  @Prop({ type: Date }) returnReceivedAt?: Date;
  @Prop({ type: Date }) refundedAt?: Date;
}
export const ReturnRequestSchema = SchemaFactory.createForClass(ReturnRequest);
ReturnRequestSchema.index({ buyerId: 1, createdAt: -1 });
ReturnRequestSchema.index({ sellerId: 1, createdAt: -1 });

@Schema({ timestamps: true })
export class Refund {
  @Prop({ required: true, unique: true, index: true }) refundCode: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, unique: true, index: true }) returnRequestId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) orderId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) buyerId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) shopId: Types.ObjectId;
  @Prop({ required: true, min: 0 }) amount: number;
  @Prop({ required: true }) method: string;
  @Prop({ default: '' }) provider: string;
  @Prop({ enum: REFUND_STATUSES, default: 'PENDING', index: true }) status: string;
  @Prop({ default: '' }) externalReference: string;
  @Prop({ default: '' }) note: string;
  @Prop({ type: MongooseSchema.Types.ObjectId }) processedBy?: Types.ObjectId;
  @Prop({ type: Date }) processedAt?: Date;
}
export const RefundSchema = SchemaFactory.createForClass(Refund);

@Schema({ timestamps: true })
export class Dispute {
  @Prop({ required: true, unique: true, index: true }) disputeCode: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) returnRequestId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) orderId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) buyerId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) shopId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) sellerId: Types.ObjectId;
  @Prop({ required: true }) reason: string;
  @Prop({ default: '' }) detail: string;
  @Prop({ enum: DISPUTE_STATUSES, default: 'OPEN', index: true }) status: string;
  @Prop({ default: '' }) resolutionNote: string;
  @Prop({ type: MongooseSchema.Types.ObjectId }) resolvedBy?: Types.ObjectId;
  @Prop({ type: Date }) resolvedAt?: Date;
}
export const DisputeSchema = SchemaFactory.createForClass(Dispute);
DisputeSchema.index({ createdAt: -1 });
