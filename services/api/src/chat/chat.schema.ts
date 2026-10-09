import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) buyerId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) shopId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) sellerId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, index: true }) productId?: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, index: true }) orderId?: Types.ObjectId;
  @Prop({ default: '' }) lastMessage: string;
  @Prop({ type: Date, default: Date.now, index: true }) lastMessageAt: Date;
  @Prop({ default: 0, min: 0 }) buyerUnread: number;
  @Prop({ default: 0, min: 0 }) sellerUnread: number;
  @Prop({ enum: ['ACTIVE','CLOSED'], default: 'ACTIVE', index: true }) status: string;
}
export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ buyerId: 1, shopId: 1 }, { unique: true });
ConversationSchema.index({ sellerId: 1, lastMessageAt: -1 });

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) conversationId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) senderId: Types.ObjectId;
  @Prop({ enum: ['BUYER','SELLER'], required: true }) senderRole: string;
  @Prop({ enum: ['TEXT','PRODUCT','ORDER'], default: 'TEXT' }) type: string;
  @Prop({ default: '', maxlength: 2000 }) text: string;
  @Prop({ type: [String], default: [] }) attachments: string[];
  @Prop({ type: MongooseSchema.Types.ObjectId }) productId?: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId }) orderId?: Types.ObjectId;
  @Prop({ type: Date, default: null }) readAt?: Date | null;
}
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });
