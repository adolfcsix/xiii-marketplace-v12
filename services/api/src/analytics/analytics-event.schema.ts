import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class AnalyticsEvent {
  @Prop({ enum: ['PRODUCT_VIEW'], required: true, index: true })
  type: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);
AnalyticsEventSchema.index({ shopId: 1, type: 1, createdAt: -1 });
AnalyticsEventSchema.index({ productId: 1, type: 1, createdAt: -1 });
