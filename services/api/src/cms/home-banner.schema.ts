import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type BannerPlacement = 'HERO' | 'PROMO' | 'EDITORIAL';

@Schema({ timestamps: true })
export class HomeBanner {
  @Prop({ required: true, trim: true, unique: true, index: true }) key: string;
  @Prop({ required: true, enum: ['HERO','PROMO','EDITORIAL'], index: true }) placement: BannerPlacement;
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ default: '' }) subtitle: string;
  @Prop({ default: '' }) eyebrow: string;
  @Prop({ required: true }) image: string;
  @Prop({ default: '' }) mobileImage: string;
  @Prop({ default: '/search' }) href: string;
  @Prop({ default: 'Khám phá' }) ctaLabel: string;
  @Prop({ default: 0, index: true }) sortOrder: number;
  @Prop({ default: true, index: true }) active: boolean;
  @Prop({ type: Date, default: null, index: true }) startAt?: Date | null;
  @Prop({ type: Date, default: null, index: true }) endAt?: Date | null;
  @Prop({ default: '' }) adminNote: string;
}
export const HomeBannerSchema = SchemaFactory.createForClass(HomeBanner);
HomeBannerSchema.index({ placement: 1, active: 1, sortOrder: 1 });
