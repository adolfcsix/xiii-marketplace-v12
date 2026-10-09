import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class PromotionCampaign {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  sellerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ enum: ['PERCENT', 'FIXED'], required: true })
  type: string;

  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({ min: 0 })
  maxDiscount?: number;

  @Prop({ enum: ['ALL_PRODUCTS', 'SELECTED_PRODUCTS'], default: 'SELECTED_PRODUCTS' })
  scope: string;

  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  productIds: Types.ObjectId[];

  @Prop({ type: Date, required: true, index: true })
  startAt: Date;

  @Prop({ type: Date, required: true, index: true })
  endAt: Date;

  @Prop({ default: true, index: true })
  active: boolean;

  @Prop({ type: Date })
  archivedAt?: Date;
}

export const PromotionCampaignSchema = SchemaFactory.createForClass(PromotionCampaign);
PromotionCampaignSchema.index({ shopId: 1, active: 1, startAt: 1, endAt: 1 });
