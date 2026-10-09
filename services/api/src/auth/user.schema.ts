import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type UserDocument = HydratedDocument<User>;
@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
    email: string;
    @Prop({ trim: true, sparse: true, unique: true })
    phone?: string;
    @Prop({ required: true })
    passwordHash: string;
    @Prop({ required: true, trim: true })
    fullName: string;
    @Prop({ default: '' })
    avatar: string;
    @Prop({ type: [String], enum: ['BUYER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'], default: ['BUYER'] })
    roles: string[];
    @Prop({ enum: ['ACTIVE', 'BLOCKED', 'PENDING'], default: 'ACTIVE', index: true })
    status: string;
    @Prop({ default: false })
    emailVerified: boolean;
    @Prop({ default: false })
    phoneVerified: boolean;
    @Prop()
    refreshTokenHash?: string;
    @Prop()
    lastLoginAt?: Date;
}
export const UserSchema = SchemaFactory.createForClass(User);

