import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import { ADMIN_PERMISSIONS } from './access.constants';
export type AdminAccessDocument = HydratedDocument<AdminAccess>;
@Schema({ timestamps: true })
export class AdminAccess {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, unique: true, index: true }) userId: Types.ObjectId;
  @Prop({ type: [String], enum: ADMIN_PERMISSIONS, default: [] }) permissions: string[];
  @Prop({ enum: ['ACTIVE','SUSPENDED'], default: 'ACTIVE', index: true }) status: string;
  @Prop({ type: MongooseSchema.Types.ObjectId }) updatedBy?: Types.ObjectId;
}
export const AdminAccessSchema = SchemaFactory.createForClass(AdminAccess);
