import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
@Schema({ timestamps: true })
export class Address {
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
    userId: Types.ObjectId;
    @Prop({ required: true })
    recipientName: string;
    @Prop({ required: true })
    phone: string;
    @Prop({ required: true })
    province: string;
    @Prop({ required: true })
    district: string;
    @Prop({ required: true })
    ward: string;
    @Prop({ required: true })
    addressLine: string;
    @Prop({ enum: ['HOME', 'WORK', 'OTHER'], default: 'HOME' })
    label: string;
    @Prop({ default: false })
    isDefault: boolean;
}
export const AddressSchema = SchemaFactory.createForClass(Address);
AddressSchema.index({ userId: 1, isDefault: 1 });

