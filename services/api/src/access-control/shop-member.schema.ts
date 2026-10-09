import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { SHOP_PERMISSIONS } from './access.constants';
export type ShopMemberDocument = HydratedDocument<ShopMember>;
@Schema({ timestamps: true })
export class ShopMember {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) shopId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) userId: Types.ObjectId;
  @Prop({ enum: ['OWNER','MANAGER','STAFF'], required: true, index: true }) role: string;
  @Prop({ type: [String], enum: SHOP_PERMISSIONS, default: [] }) permissions: string[];
  @Prop({ enum: ['ACTIVE','SUSPENDED'], default: 'ACTIVE', index: true }) status: string;
  @Prop({ type: MongooseSchema.Types.ObjectId }) invitedBy?: Types.ObjectId;
  @Prop() joinedAt?: Date;
}
export const ShopMemberSchema = SchemaFactory.createForClass(ShopMember);
ShopMemberSchema.index({ shopId: 1, userId: 1 }, { unique: true });
