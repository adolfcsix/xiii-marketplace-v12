import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true, collection: 'ai_artwork_jobs' })
export class AiArtworkJob {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) shopId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) productId: Types.ObjectId;
  @Prop({ required: true }) variantId: string;
  @Prop({ required: true }) actorId: string;
  @Prop({ required: true }) requestId: string;
  @Prop({ required: true, enum: ['neutral', 'masculine', 'feminine'] }) form: string;
  @Prop({ required: true }) fingerprint: string;
  @Prop({ required: true }) sourceUrl: string;
  @Prop({ required: true }) model: string;
  @Prop({ default: 'QUEUED', enum: ['QUEUED', 'RUNNING', 'READY', 'FAILED', 'REJECTED'] }) status: string;
  @Prop() outputUrl?: string;
  @Prop() error?: string;
  @Prop({ type: Date }) startedAt?: Date;
  @Prop({ type: Date }) reviewedAt?: Date;
}
export const AiArtworkJobSchema = SchemaFactory.createForClass(AiArtworkJob);
AiArtworkJobSchema.index({ shopId: 1, requestId: 1 }, { unique: true });
AiArtworkJobSchema.index({ shopId: 1, fingerprint: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['QUEUED', 'RUNNING', 'READY'] } } });
AiArtworkJobSchema.index({ status: 1, createdAt: 1 });
AiArtworkJobSchema.index({ status: 1, startedAt: 1 });

@Schema({ collection: 'ai_artwork_quotas' })
export class AiArtworkQuota {
  @Prop({ required: true }) _id: string;
  @Prop({ default: 0 }) used: number;
  @Prop({ type: Date }) expiresAt: Date;
}
export const AiArtworkQuotaSchema = SchemaFactory.createForClass(AiArtworkQuota);
AiArtworkQuotaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
