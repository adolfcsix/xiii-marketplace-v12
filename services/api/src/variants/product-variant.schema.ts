import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
@Schema({ timestamps: true })
export class ProductVariant {
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
    productId: Types.ObjectId;
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
    shopId: Types.ObjectId;
    @Prop({ required: true, unique: true, index: true })
    sku: string;
    @Prop({ type: Object, default: {} })
    attributes: Record<string, string>;
    @Prop({ required: true, min: 0 })
    price: number;
    @Prop({ min: 0 })
    compareAtPrice?: number;
    @Prop({ default: 0, min: 0 })
    weight: number;
    @Prop({ default: '' })
    image: string;
    @Prop({ enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE', index: true })
    status: string;
}
export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);
ProductVariantSchema.index({ productId: 1, status: 1 });

