import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true, collection: 'marketplacesettings' })
export class MarketplaceSettings {
  @Prop({ required: true, unique: true, default: 'marketplace' }) key: string;
  @Prop({ default: 25000, min: 0, max: 1000000 }) standardShippingFee: number;
  @Prop({ default: 45000, min: 0, max: 1000000 }) expressShippingFee: number;
  @Prop({ default: 15, min: 5, max: 120 }) paymentExpiresMinutes: number;
  @Prop({ default: true }) codEnabled: boolean;
  @Prop({ default: true }) momoEnabled: boolean;
  @Prop({ default: true }) vnpayEnabled: boolean;
  @Prop({ type: MongooseSchema.Types.ObjectId }) updatedBy?: Types.ObjectId;
}
export const MarketplaceSettingsSchema = SchemaFactory.createForClass(MarketplaceSettings);
