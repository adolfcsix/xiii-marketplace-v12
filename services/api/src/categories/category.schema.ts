import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';
@Schema({ timestamps: true })
export class Category {
    @Prop({ type: MongooseSchema.Types.ObjectId, index: true, default: null })
    parentId?: Types.ObjectId;
    @Prop({ required: true })
    name: string;
    @Prop({ required: true, unique: true, index: true })
    slug: string;
    @Prop({ default: '' })
    image: string;
    @Prop({ default: '' })
    icon: string;
    @Prop({ default: 0 })
    level: number;
    @Prop({ default: 0 })
    sortOrder: number;
    @Prop({ default: true, index: true })
    active: boolean;
}
export const CategorySchema = SchemaFactory.createForClass(Category);

