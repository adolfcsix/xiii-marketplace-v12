import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ProductReview {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ enum: ['SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN'], required: true, index: true })
  action: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, index: true })
  actorId?: Types.ObjectId;

  @Prop({ default: '' })
  note: string;
}

export const ProductReviewSchema = SchemaFactory.createForClass(ProductReview);
ProductReviewSchema.index({ productId: 1, createdAt: -1 });
