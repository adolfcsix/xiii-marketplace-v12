import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class HomeSection {
  @Prop({ required: true, unique: true, index: true }) key: string;
  @Prop({ required: true }) title: string;
  @Prop({ default: '' }) subtitle: string;
  @Prop({ required: true, enum: ['CATEGORY_RAIL','PRODUCT_GRID','BANNER_GRID','BENEFIT_STRIP','CUSTOM'] }) type: string;
  @Prop({ default: 0, index: true }) sortOrder: number;
  @Prop({ default: true, index: true }) active: boolean;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) config: Record<string, unknown>;
}
export const HomeSectionSchema = SchemaFactory.createForClass(HomeSection);
