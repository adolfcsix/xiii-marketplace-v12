import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
export type AuditLogDocument = HydratedDocument<AuditLog>;
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, index: true }) actorId?: Types.ObjectId;
  @Prop({ default: '' }) actorEmail: string;
  @Prop({ type: [String], default: [] }) actorRoles: string[];
  @Prop({ type: MongooseSchema.Types.ObjectId, index: true }) shopId?: Types.ObjectId;
  @Prop({ required: true, index: true }) action: string;
  @Prop({ required: true }) method: string;
  @Prop({ required: true, index: true }) path: string;
  @Prop({ required: true }) statusCode: number;
  @Prop({ default: false, index: true }) success: boolean;
  @Prop({ default: '' }) resourceType: string;
  @Prop({ default: '' }) resourceId: string;
  @Prop({ default: '' }) ip: string;
  @Prop({ default: '' }) userAgent: string;
  @Prop({ type: Object, default: {} }) metadata: Record<string, unknown>;
}
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1, actorId: 1 });
