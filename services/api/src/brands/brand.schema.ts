import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ timestamps: true })
export class Brand {
    @Prop({ required: true })
    name: string;
    @Prop({ required: true, unique: true, index: true })
    slug: string;
    @Prop({ default: '' })
    logo: string;
    @Prop({ default: '' })
    description: string;
    @Prop({ default: false })
    verified: boolean;
    @Prop({ default: true, index: true })
    active: boolean;
}
export const BrandSchema = SchemaFactory.createForClass(Brand);

