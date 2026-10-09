import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
@Schema({ timestamps: true })
export class SellerApplication {
    @Prop({ type: MongooseSchema.Types.ObjectId, required: true, unique: true, index: true })
    userId: Types.ObjectId;
    @Prop({ enum: ['INDIVIDUAL', 'BUSINESS'], required: true })
    sellerType: string;
    @Prop({ required: true, trim: true })
    shopName: string;
    @Prop({ enum: ['CCCD', 'PASSPORT'], required: true })
    identityType: string;
    @Prop({ required: true })
    identityNumber: string;
    @Prop({ required: true })
    identityFrontImage: string;
    @Prop()
    identityBackImage?: string;
    @Prop({ required: true })
    selfieImage: string;
    @Prop()
    taxCode?: string;
    @Prop({ type: Object, required: true })
    address: Record<string, unknown>;
    @Prop({ enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true })
    status: string;
    @Prop()
    rejectionReason?: string;
    @Prop({ default: Date.now })
    submittedAt: Date;
    @Prop()
    reviewedAt?: Date;
    @Prop({ type: MongooseSchema.Types.ObjectId })
    reviewedBy?: Types.ObjectId;
}
export const SellerApplicationSchema = SchemaFactory.createForClass(SellerApplication);

