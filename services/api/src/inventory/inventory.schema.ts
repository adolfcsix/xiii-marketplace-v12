import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
@Schema({ timestamps: true })
export class Inventory {
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, unique: true, index: true })
    variantId: Types.ObjectId;
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
    shopId: Types.ObjectId;
    @Prop({ default: 0, min: 0 })
    available: number;
    @Prop({ default: 0, min: 0 })
    reserved: number;
    @Prop({ default: 0, min: 0 })
    sold: number;
    @Prop({ default: 5, min: 0 })
    lowStockThreshold: number;
}
export const InventorySchema = SchemaFactory.createForClass(Inventory);

