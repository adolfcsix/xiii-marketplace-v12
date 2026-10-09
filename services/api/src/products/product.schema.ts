import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
@Schema({ timestamps: true })
export class Product {
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
    shopId: Types.ObjectId;
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
    categoryId: Types.ObjectId;
    @Prop({ type: MongooseSchema.Types.ObjectId, index: true })
    brandId?: Types.ObjectId;
    @Prop({ required: true, index: 'text' })
    name: string;
    @Prop({ required: true, unique: true, index: true })
    slug: string;
    @Prop({ default: '' })
    shortDescription: string;
    @Prop({ default: '', index: 'text' })
    description: string;
    @Prop({ type: [String], default: [] })
    images: string[];
    @Prop({ type: Object, default: {} })
    attributes: Record<string, unknown>;
    @Prop({ enum: ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'HIDDEN'], default: 'DRAFT', index: true })
    status: string;
    @Prop()
    submittedForReviewAt?: Date;
    @Prop()
    reviewedAt?: Date;
    @Prop({ type: MongooseSchema.Types.ObjectId })
    reviewedBy?: Types.ObjectId;
    @Prop({ default: '' })
    rejectionReason: string;
    @Prop({ default: 0 })
    ratingAverage: number;
    @Prop({ default: 0 })
    ratingCount: number;
    @Prop({ default: 0 })
    soldCount: number;
    @Prop({ default: 0 })
    viewCount: number;
}
export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ name: 'text', description: 'text' });

