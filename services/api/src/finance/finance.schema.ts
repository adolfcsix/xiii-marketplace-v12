import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

export const LEDGER_TYPES = ['SALE_GROSS','PLATFORM_FEE','REFUND_DEBIT','FEE_REVERSAL','WITHDRAWAL','ADJUSTMENT'] as const;
export const LEDGER_STATUSES = ['PENDING','AVAILABLE'] as const;
export const WITHDRAWAL_STATUSES = ['REQUESTED','APPROVED','PROCESSING','PAID','REJECTED','CANCELLED'] as const;

@Schema({ timestamps: true })
export class SellerLedgerEntry {
  @Prop({ required: true, unique: true, index: true }) ledgerCode: string;
  @Prop({ required: true, unique: true, index: true }) idempotencyKey: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) sellerId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) shopId: Types.ObjectId;
  @Prop({ enum: LEDGER_TYPES, required: true, index: true }) type: string;
  @Prop({ required: true }) amount: number;
  @Prop({ default: 'VND' }) currency: string;
  @Prop({ enum: LEDGER_STATUSES, required: true, index: true }) status: string;
  @Prop({ type: Date, index: true }) availableAt?: Date;
  @Prop({ type: Date }) settledAt?: Date;
  @Prop({ type: MongooseSchema.Types.ObjectId, index: true }) orderId?: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, index: true }) subOrderId?: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, index: true }) refundId?: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, index: true }) withdrawalId?: Types.ObjectId;
  @Prop({ default: '', index: true }) referenceCode: string;
  @Prop({ default: '' }) description: string;
  @Prop({ type: Object, default: {} }) metadata: Record<string, unknown>;
}
export const SellerLedgerEntrySchema = SchemaFactory.createForClass(SellerLedgerEntry);
SellerLedgerEntrySchema.index({ sellerId: 1, createdAt: -1 });
SellerLedgerEntrySchema.index({ sellerId: 1, status: 1, availableAt: 1 });

@Schema({ timestamps: true })
export class SellerPayoutAccount {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, unique: true, index: true }) sellerId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) shopId: Types.ObjectId;
  @Prop({ required: true }) bankCode: string;
  @Prop({ default: '' }) bankName: string;
  @Prop({ required: true }) accountName: string;
  @Prop({ required: true }) accountNumberCiphertext: string;
  @Prop({ required: true }) accountNumberIv: string;
  @Prop({ required: true }) accountNumberTag: string;
  @Prop({ required: true }) accountNumberLast4: string;
  @Prop({ enum: ['ACTIVE','DISABLED'], default: 'ACTIVE', index: true }) status: string;
  @Prop({ default: 0 }) financeVersion: number;
  @Prop({ type: Date }) verifiedAt?: Date;
}
export const SellerPayoutAccountSchema = SchemaFactory.createForClass(SellerPayoutAccount);

@Schema({ timestamps: true })
export class WithdrawalRequest {
  @Prop({ required: true, unique: true, index: true }) withdrawalCode: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) sellerId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true }) shopId: Types.ObjectId;
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) payoutAccountId: Types.ObjectId;
  @Prop({ required: true, min: 0 }) amount: number;
  @Prop({ default: 'VND' }) currency: string;
  @Prop({ enum: WITHDRAWAL_STATUSES, default: 'REQUESTED', index: true }) status: string;
  @Prop({ type: Object, required: true }) payoutSnapshot: Record<string, unknown>;
  @Prop({ default: '' }) sellerNote: string;
  @Prop({ default: '' }) adminNote: string;
  @Prop({ default: '' }) rejectionReason: string;
  @Prop({ default: '' }) externalReference: string;
  @Prop({ type: MongooseSchema.Types.ObjectId }) processedBy?: Types.ObjectId;
  @Prop({ type: Date }) approvedAt?: Date;
  @Prop({ type: Date }) processingAt?: Date;
  @Prop({ type: Date }) paidAt?: Date;
  @Prop({ type: Date }) rejectedAt?: Date;
  @Prop({ type: Date }) cancelledAt?: Date;
}
export const WithdrawalRequestSchema = SchemaFactory.createForClass(WithdrawalRequest);
WithdrawalRequestSchema.index({ sellerId: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ status: 1, createdAt: -1 });

@Schema({ timestamps: true })
export class FinanceSetting {
  @Prop({ required: true, unique: true, default: 'marketplace' }) key: string;
  @Prop({ required: true, default: 500, min: 0, max: 5000 }) commissionRateBps: number;
  @Prop({ required: true, default: 7, min: 0, max: 30 }) settlementDelayDays: number;
  @Prop({ required: true, default: 100000, min: 0 }) minWithdrawalAmount: number;
  @Prop({ required: true, default: 100000000, min: 0 }) maxWithdrawalAmount: number;
  @Prop({ type: MongooseSchema.Types.ObjectId }) updatedBy?: Types.ObjectId;
}
export const FinanceSettingSchema = SchemaFactory.createForClass(FinanceSetting);
