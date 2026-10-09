import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
@Schema({ timestamps: true })
export class Shop {
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
    ownerId: Types.ObjectId;
    @Prop({ required: true, trim: true })
    name: string;
    @Prop({ required: true, unique: true, index: true })
    slug: string;
    @Prop({ default: '' })
    logo: string;
    @Prop({ default: '' })
    banner: string;
    @Prop({ default: '' })
    description: string;
    @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
    businessCategories: Types.ObjectId[];
    @Prop({ type: Object })
    address?: Record<string, unknown>;
    @Prop({ default: 0 })
    ratingAverage: number;
    @Prop({ default: 0 })
    ratingCount: number;
    @Prop({ default: 0 })
    followerCount: number;
    @Prop({ default: 0 })
    productCount: number;
    @Prop({ default: 0 })
    responseRate: number;
    @Prop({ enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'], default: 'ACTIVE', index: true })
    status: string;
    @Prop({ default: false })
    verified: boolean;
    @Prop({ default: '' })
    contactEmail: string;
    @Prop({ default: '' })
    contactPhone: string;
    @Prop({ default: 2, min: 1, max: 14 })
    orderPreparationDays: number;
    @Prop({ default: '' })
    returnPolicy: string;
    @Prop({ default: 0 })
    financeVersion: number;
}
export const ShopSchema = SchemaFactory.createForClass(Shop);

