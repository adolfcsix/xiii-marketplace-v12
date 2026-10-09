import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

export const REVIEW_STATUSES = ['PUBLISHED','HIDDEN'] as const;

@Schema({ timestamps: true, collection: 'customerreviews' })
export class CustomerReview {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) orderId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) subOrderId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) orderItemId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) buyerId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) shopId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) sellerId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) productId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) variantId: Types.ObjectId;
  @Prop({ required: true, min: 1, max: 5 }) rating: number;
  @Prop({ default: '', maxlength: 2000 }) comment: string;
  @Prop({ type: [String], default: [] }) media: string[];
  @Prop({ default: true }) verifiedPurchase: boolean;
  @Prop({ enum: REVIEW_STATUSES, default: 'PUBLISHED', index: true }) status: string;
  @Prop({ default: '' }) moderationReason: string;
  @Prop({ type: MongooseSchema.Types.ObjectId }) moderatedBy?: Types.ObjectId;
  @Prop() moderatedAt?: Date;
  @Prop({ default: '', maxlength: 1200 }) sellerReply: string;
  @Prop() sellerRepliedAt?: Date;
  @Prop({ default: 0, min: 0 }) helpfulCount: number;
}

export const CustomerReviewSchema = SchemaFactory.createForClass(CustomerReview);
CustomerReviewSchema.index({ orderItemId: 1, buyerId: 1 }, { unique: true });
CustomerReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
CustomerReviewSchema.index({ shopId: 1, status: 1, createdAt: -1 });
