import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
@Schema({ timestamps: true })
export class InventoryTransaction {
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
    shopId: Types.ObjectId;
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
    variantId: Types.ObjectId;
    @Prop({ enum: ['IMPORT', 'RESERVE', 'RELEASE', 'SALE', 'RETURN', 'ADJUSTMENT'], required: true })
    type: string;
    @Prop({ required: true })
    quantity: number;
    @Prop()
    referenceType?: string;
    @Prop({ type: MongooseSchema.Types.ObjectId })
    referenceId?: Types.ObjectId;
    @Prop({ required: true })
    beforeQuantity: number;
    @Prop({ required: true })
    afterQuantity: number;
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
    createdBy: Types.ObjectId;
    @Prop()
    note?: string;
}
export const InventoryTransactionSchema = SchemaFactory.createForClass(InventoryTransaction);

