import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { Order, SubOrder } from '../orders/order.schema';
import { Refund, ReturnRequest } from '../returns/return.schema';
import { Shop } from '../shops/shop.schema';
import { CreateWithdrawalDto, ListLedgerDto, ListWithdrawalsDto, MarkPaidWithdrawalDto, RejectWithdrawalDto, SavePayoutAccountDto, UpdateFinanceSettingsDto } from './finance.dto';
import { FinanceSetting, SellerLedgerEntry, SellerPayoutAccount, WithdrawalRequest } from './finance.schema';
import { ShopAccessService } from '../access-control/shop-access.service';

const DEFAULT_SETTINGS = { commissionRateBps: 500, settlementDelayDays: 7, minWithdrawalAmount: 100000, maxWithdrawalAmount: 100000000 };
const ACTIVE_WITHDRAWALS = ['REQUESTED','APPROVED','PROCESSING'];

@Injectable()
export class FinanceService {
  constructor(
    private readonly config: ConfigService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(SellerLedgerEntry.name) private readonly ledger: Model<SellerLedgerEntry>,
    @InjectModel(SellerPayoutAccount.name) private readonly payoutAccounts: Model<SellerPayoutAccount>,
    @InjectModel(WithdrawalRequest.name) private readonly withdrawals: Model<WithdrawalRequest>,
    @InjectModel(FinanceSetting.name) private readonly settingsModel: Model<FinanceSetting>,
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    @InjectModel(SubOrder.name) private readonly subOrders: Model<SubOrder>,
    private readonly notifications: NotificationsService,
    private readonly shopAccess: ShopAccessService,
  ) {}

  private oid(v: string | Types.ObjectId) { return v instanceof Types.ObjectId ? v : new Types.ObjectId(v); }
  private code(prefix: string) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0,6).toUpperCase()}`; }
  private key() { return createHash('sha256').update(this.config.get('PAYOUT_ENCRYPTION_KEY') || this.config.get('JWT_ACCESS_SECRET') || 'xiii-dev-payout-key-change-me').digest(); }
  private encrypt(value: string) {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
  }
  private decrypt(row: any) {
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(row.accountNumberIv, 'base64'));
    decipher.setAuthTag(Buffer.from(row.accountNumberTag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(row.accountNumberCiphertext, 'base64')), decipher.final()]).toString('utf8');
  }

  private async principal(userId:string){const access=await this.shopAccess.resolve(userId,true);return{sellerId:access.ownerId,shopId:access.shopId,shop:access.shop};}
  private async shopForSeller(sellerId: string | Types.ObjectId, session?: ClientSession) {
    const query = this.shops.findOne({ ownerId: this.oid(sellerId), status: 'ACTIVE' }); if (session) query.session(session);
    const shop = await query.lean<any>(); if (!shop) throw new NotFoundException('SELLER_SHOP_NOT_FOUND'); return shop;
  }

  async getSettings(session?: ClientSession) {
    const query = this.settingsModel.findOne({ key: 'marketplace' }); if (session) query.session(session);
    const row = await query.lean<any>();
    return row ? { commissionRateBps: row.commissionRateBps, settlementDelayDays: row.settlementDelayDays, minWithdrawalAmount: row.minWithdrawalAmount, maxWithdrawalAmount: row.maxWithdrawalAmount } : { ...DEFAULT_SETTINGS };
  }

  async updateSettings(adminId: string, dto: UpdateFinanceSettingsDto) {
    const current = await this.getSettings();
    const next = { ...current, ...Object.fromEntries(Object.entries(dto).filter(([,v]) => v !== undefined)) } as typeof current;
    if (next.maxWithdrawalAmount < next.minWithdrawalAmount) throw new ConflictException('INVALID_WITHDRAWAL_LIMITS');
    return this.settingsModel.findOneAndUpdate({ key: 'marketplace' }, { $set: { ...next, updatedBy: this.oid(adminId) } }, { upsert: true, new: true }).lean<any>();
  }

  async releaseMatured(sellerId?: string | Types.ObjectId, session?: ClientSession) {
    const filter: any = { status: 'PENDING', availableAt: { $lte: new Date() } }; if (sellerId) filter.sellerId = this.oid(sellerId);
    return this.ledger.updateMany(filter, { $set: { status: 'AVAILABLE', settledAt: new Date() } }, { session });
  }

  private async putLedger(input: any, session: ClientSession) {
    await this.ledger.updateOne({ idempotencyKey: input.idempotencyKey }, { $setOnInsert: { ledgerCode: this.code('LED'), currency: 'VND', ...input } }, { upsert: true, session });
  }

  async recordCompletedSubOrders(order: any, subs: any[], session: ClientSession) {
    const settings = await this.getSettings(session);
    const availableAt = new Date(Date.now() + settings.settlementDelayDays * 86400000);
    for (const sub of subs) {
      await this.shops.updateOne({ _id: sub.shopId }, { $inc: { financeVersion: 1 } }, { session });
      const base = { sellerId: sub.sellerId, shopId: sub.shopId, status: settings.settlementDelayDays === 0 ? 'AVAILABLE' : 'PENDING', availableAt, orderId: order._id, subOrderId: sub._id, referenceCode: sub.subOrderCode };
      await this.putLedger({ ...base, idempotencyKey: `SALE_GROSS:${sub._id}`, type: 'SALE_GROSS', amount: Math.max(0, Number(sub.subtotal || 0) - Number(sub.shopDiscount || 0)), description: `Doanh thu gộp ${sub.subOrderCode}`, metadata: { orderCode: order.orderCode } }, session);
      if (Number(sub.platformFee || 0) > 0) await this.putLedger({ ...base, idempotencyKey: `PLATFORM_FEE:${sub._id}`, type: 'PLATFORM_FEE', amount: -Number(sub.platformFee), description: `Phí nền tảng ${sub.subOrderCode}`, metadata: { commissionRateBps: settings.commissionRateBps, orderCode: order.orderCode } }, session);
    }
  }

  async recordRefund(refund: any, returnRequest: any, session: ClientSession) {
    if (returnRequest.sourceSubOrderStatus !== 'COMPLETED') return;
    await this.releaseMatured(returnRequest.sellerId, session);
    await this.shops.updateOne({ _id: returnRequest.shopId }, { $inc: { financeVersion: 1 } }, { session });
    const sub = await this.subOrders.findById(returnRequest.subOrderId).session(session).lean<any>(); if (!sub) throw new NotFoundException('SUB_ORDER_NOT_FOUND');
    const sale = await this.ledger.findOne({ subOrderId: sub._id, type: 'SALE_GROSS' }).session(session).lean<any>(); if (!sale) return;
    const feeBase = Math.max(0, Number(sub.subtotal || 0) - Number(sub.voucherDiscount || 0));
    const gross = Math.min(Number(returnRequest.sellerLiabilityAmount ?? refund.amount ?? 0), feeBase);
    const feeReversal = feeBase > 0 ? Math.min(Number(sub.platformFee || 0), Math.floor(Number(sub.platformFee || 0) * gross / feeBase)) : 0;
    const base = { sellerId: returnRequest.sellerId, shopId: returnRequest.shopId, status: sale.status, availableAt: sale.availableAt || new Date(), orderId: returnRequest.orderId, subOrderId: returnRequest.subOrderId, refundId: refund._id, referenceCode: refund.refundCode };
    await this.putLedger({ ...base, idempotencyKey: `REFUND_DEBIT:${refund._id}`, type: 'REFUND_DEBIT', amount: -gross, description: `Hoàn tiền ${refund.refundCode}`, metadata: { returnRequestCode: returnRequest.requestCode } }, session);
    if (feeReversal > 0) await this.putLedger({ ...base, idempotencyKey: `FEE_REVERSAL:${refund._id}`, type: 'FEE_REVERSAL', amount: feeReversal, description: `Hoàn phí nền tảng ${refund.refundCode}`, metadata: { returnRequestCode: returnRequest.requestCode } }, session);
  }

  private async ledgerTotals(sellerId: Types.ObjectId, session?: ClientSession) {
    const pipeline: any[] = [{ $match: { sellerId } }, { $group: { _id: '$status', amount: { $sum: '$amount' } } }];
    const agg = this.ledger.aggregate(pipeline); if (session) agg.session(session); const rows = await agg;
    return Object.fromEntries(rows.map((r:any) => [r._id, Number(r.amount || 0)]));
  }
  private async heldAmount(sellerId: Types.ObjectId, session?: ClientSession) {
    const agg = this.withdrawals.aggregate([{ $match: { sellerId, status: { $in: ACTIVE_WITHDRAWALS } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]); if (session) agg.session(session); const rows = await agg; return Number(rows[0]?.amount || 0);
  }

  async sellerSummary(userId: string) {
    const principal=await this.principal(userId); const sellerId=principal.sellerId; await this.releaseMatured(sellerId);
    const [shop, settings, totals, held, latestWithdrawal] = await Promise.all([this.shopForSeller(sellerId), this.getSettings(), this.ledgerTotals(sellerId), this.heldAmount(sellerId), this.withdrawals.findOne({ sellerId }).sort({ createdAt: -1 }).lean<any>()]);
    const ledgerAvailable = Number(totals.AVAILABLE || 0); const pending = Number(totals.PENDING || 0); const withdrawable = Math.max(0, ledgerAvailable - held);
    return { shop: { _id: shop._id.toString(), name: shop.name }, pendingBalance: pending, availableLedgerBalance: ledgerAvailable, withdrawalHold: held, availableBalance: withdrawable, negativeBalance: Math.min(0, ledgerAvailable - held), settings, latestWithdrawal: latestWithdrawal ? this.serializeWithdrawal(latestWithdrawal) : null };
  }

  async listLedger(userId: string, dto: ListLedgerDto) {
    const sellerId = (await this.principal(userId)).sellerId; await this.releaseMatured(sellerId); const page=dto.page||1,limit=dto.limit||30; const filter:any={sellerId}; if(dto.type)filter.type=dto.type;if(dto.status)filter.status=dto.status;
    const [items,total]=await Promise.all([this.ledger.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.ledger.countDocuments(filter)]);
    return { items: items.map(x=>({...x,_id:x._id.toString(),sellerId:x.sellerId.toString(),shopId:x.shopId.toString()})), meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))} };
  }

  async getPayoutAccount(userId: string) {
    const sellerId=(await this.principal(userId)).sellerId; const row=await this.payoutAccounts.findOne({sellerId,status:'ACTIVE'}).lean<any>(); if(!row)return null;
    return { _id:row._id.toString(),bankCode:row.bankCode,bankName:row.bankName,accountName:row.accountName,accountNumberMasked:`•••• ${row.accountNumberLast4}`,status:row.status,updatedAt:row.updatedAt };
  }
  async savePayoutAccount(userId:string,dto:SavePayoutAccountDto){const sellerId=(await this.principal(userId)).sellerId;const shop=await this.shopForSeller(sellerId);const normalized=dto.accountNumber.replace(/\s+/g,'').trim();if(!/^[A-Za-z0-9-]{5,40}$/.test(normalized))throw new ConflictException('INVALID_ACCOUNT_NUMBER');const enc=this.encrypt(normalized);const row=await this.payoutAccounts.findOneAndUpdate({sellerId},{$set:{shopId:shop._id,bankCode:dto.bankCode.trim().toUpperCase(),bankName:(dto.bankName||'').trim(),accountName:dto.accountName.trim().toUpperCase(),accountNumberCiphertext:enc.ciphertext,accountNumberIv:enc.iv,accountNumberTag:enc.tag,accountNumberLast4:normalized.slice(-4),status:'ACTIVE'}},{upsert:true,new:true}).lean<any>();return {_id:row._id.toString(),bankCode:row.bankCode,bankName:row.bankName,accountName:row.accountName,accountNumberMasked:`•••• ${row.accountNumberLast4}`,status:row.status};}

  async createWithdrawal(userId:string,dto:CreateWithdrawalDto){const session=await this.connection.startSession();try{let result:any;await session.withTransaction(async()=>{const sellerId=(await this.principal(userId)).sellerId;await this.releaseMatured(sellerId,session);const shop=await this.shopForSeller(sellerId,session);const settings=await this.getSettings(session);if(dto.amount<settings.minWithdrawalAmount||dto.amount>settings.maxWithdrawalAmount)throw new ConflictException('WITHDRAWAL_AMOUNT_OUT_OF_RANGE');const payout=await this.payoutAccounts.findOne({sellerId,status:'ACTIVE'}).session(session).lean<any>();if(!payout)throw new ConflictException('PAYOUT_ACCOUNT_REQUIRED');await this.shops.updateOne({_id:shop._id},{$inc:{financeVersion:1}},{session});const totals=await this.ledgerTotals(sellerId,session);const held=await this.heldAmount(sellerId,session);const available=Math.max(0,Number(totals.AVAILABLE||0)-held);if(dto.amount>available)throw new ConflictException('INSUFFICIENT_AVAILABLE_BALANCE');const [row]=await this.withdrawals.create([{withdrawalCode:this.code('WD'),sellerId,shopId:shop._id,payoutAccountId:payout._id,amount:dto.amount,status:'REQUESTED',payoutSnapshot:{bankCode:payout.bankCode,bankName:payout.bankName,accountName:payout.accountName,accountNumberLast4:payout.accountNumberLast4,accountNumberCiphertext:payout.accountNumberCiphertext,accountNumberIv:payout.accountNumberIv,accountNumberTag:payout.accountNumberTag},sellerNote:(dto.note||'').trim()}],{session});result=this.serializeWithdrawal(row.toObject());});return result;}finally{await session.endSession();}}
  async listWithdrawalsForSeller(userId:string,dto:ListWithdrawalsDto){const sellerId=(await this.principal(userId)).sellerId,page=dto.page||1,limit=dto.limit||20;const filter:any={sellerId};if(dto.status)filter.status=dto.status;const [items,total]=await Promise.all([this.withdrawals.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.withdrawals.countDocuments(filter)]);return{items:items.map(x=>this.serializeWithdrawal(x)),meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};}
  async cancelWithdrawal(userId:string,code:string){const sellerId=(await this.principal(userId)).sellerId;const row=await this.withdrawals.findOneAndUpdate({withdrawalCode:code,sellerId,status:'REQUESTED'},{$set:{status:'CANCELLED',cancelledAt:new Date()}},{new:true}).lean<any>();if(!row)throw new ConflictException('WITHDRAWAL_NOT_CANCELLABLE');return this.serializeWithdrawal(row);}

  async adminSummary(){await this.releaseMatured();const [pendingCount,pendingAmount,processingCount,paidAmount]=await Promise.all([this.withdrawals.countDocuments({status:'REQUESTED'}),this.withdrawals.aggregate([{$match:{status:'REQUESTED'}},{$group:{_id:null,amount:{$sum:'$amount'}}}]),this.withdrawals.countDocuments({status:{$in:['APPROVED','PROCESSING']}}),this.withdrawals.aggregate([{$match:{status:'PAID'}},{$group:{_id:null,amount:{$sum:'$amount'}}}])]);return{requestedCount:pendingCount,requestedAmount:Number(pendingAmount[0]?.amount||0),processingCount,paidAmount:Number(paidAmount[0]?.amount||0),settings:await this.getSettings()};}
  async adminListWithdrawals(dto:ListWithdrawalsDto){const page=dto.page||1,limit=dto.limit||30,filter:any={};if(dto.status)filter.status=dto.status;const [items,total]=await Promise.all([this.withdrawals.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.withdrawals.countDocuments(filter)]);return{items:items.map(x=>this.serializeWithdrawal(x)),meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};}
  async adminWithdrawalDetail(code:string){const row=await this.withdrawals.findOne({withdrawalCode:code}).lean<any>();if(!row)throw new NotFoundException('WITHDRAWAL_NOT_FOUND');const payout=await this.payoutAccounts.findById(row.payoutAccountId).lean<any>();const shop=await this.shops.findById(row.shopId).select({name:1,slug:1}).lean<any>();const snap=row.payoutSnapshot||{};const source=snap.accountNumberCiphertext?snap:payout;return{...this.serializeWithdrawal(row),shop:shop?{_id:shop._id.toString(),name:shop.name,slug:shop.slug}:null,payoutAccount:source?{bankCode:snap.bankCode||payout?.bankCode,bankName:snap.bankName||payout?.bankName,accountName:snap.accountName||payout?.accountName,accountNumber:this.decrypt(source)}:null};}
  async approveWithdrawal(adminId:string,code:string){return this.transitionWithdrawal(adminId,code,['REQUESTED'],'APPROVED',{approvedAt:new Date()});}
  async processWithdrawal(adminId:string,code:string){return this.transitionWithdrawal(adminId,code,['APPROVED'],'PROCESSING',{processingAt:new Date()});}
  async rejectWithdrawal(adminId:string,code:string,dto:RejectWithdrawalDto){const row=await this.withdrawals.findOneAndUpdate({withdrawalCode:code,status:{$in:['REQUESTED','APPROVED']}},{$set:{status:'REJECTED',rejectionReason:dto.reason.trim(),rejectedAt:new Date(),processedBy:this.oid(adminId)}},{new:true}).lean<any>();if(!row)throw new ConflictException('WITHDRAWAL_NOT_REJECTABLE');await this.notifications.createSafe({userId:row.sellerId.toString(),type:'FINANCE',title:'Yêu cầu rút tiền bị từ chối',body:`${code} · ${dto.reason.trim()}`,data:{withdrawalCode:code,status:'REJECTED'}});return this.serializeWithdrawal(row);}
  private async transitionWithdrawal(adminId:string,code:string,from:string[],to:string,extra:any){const row=await this.withdrawals.findOneAndUpdate({withdrawalCode:code,status:{$in:from}},{$set:{status:to,processedBy:this.oid(adminId),...extra}},{new:true}).lean<any>();if(!row)throw new ConflictException('INVALID_WITHDRAWAL_TRANSITION');await this.notifications.createSafe({userId:row.sellerId.toString(),type:'FINANCE',title:'Cập nhật yêu cầu rút tiền',body:`${code} → ${to}`,data:{withdrawalCode:code,status:to}});return this.serializeWithdrawal(row);}
  async markWithdrawalPaid(adminId:string,code:string,dto:MarkPaidWithdrawalDto){const session=await this.connection.startSession();try{let result:any;let seller='';await session.withTransaction(async()=>{const row=await this.withdrawals.findOne({withdrawalCode:code,status:'PROCESSING'}).session(session).lean<any>();if(!row)throw new ConflictException('WITHDRAWAL_NOT_PROCESSING');seller=row.sellerId.toString();await this.releaseMatured(row.sellerId,session);const totals=await this.ledgerTotals(row.sellerId,session);if(Number(totals.AVAILABLE||0)<row.amount)throw new ConflictException('LEDGER_BALANCE_CHANGED');await this.putLedger({idempotencyKey:`WITHDRAWAL:${row._id}`,sellerId:row.sellerId,shopId:row.shopId,type:'WITHDRAWAL',amount:-row.amount,status:'AVAILABLE',availableAt:new Date(),settledAt:new Date(),withdrawalId:row._id,referenceCode:row.withdrawalCode,description:`Rút tiền ${row.withdrawalCode}`,metadata:{externalReference:dto.externalReference.trim()}},session);await this.withdrawals.updateOne({_id:row._id,status:'PROCESSING'},{$set:{status:'PAID',externalReference:dto.externalReference.trim(),adminNote:(dto.note||'').trim(),paidAt:new Date(),processedBy:this.oid(adminId)}},{session});result={...this.serializeWithdrawal(row),status:'PAID',externalReference:dto.externalReference.trim(),paidAt:new Date()};});if(seller)await this.notifications.createSafe({userId:seller,type:'FINANCE',title:'Rút tiền thành công',body:`${code} đã được chuyển khoản.`,data:{withdrawalCode:code,status:'PAID'}});return result;}finally{await session.endSession();}}

  private serializeWithdrawal(row:any){const snap=row.payoutSnapshot||{};return{...row,payoutSnapshot:{bankCode:snap.bankCode||'',bankName:snap.bankName||'',accountName:snap.accountName||'',accountNumberLast4:snap.accountNumberLast4||''},_id:row._id.toString(),sellerId:row.sellerId.toString(),shopId:row.shopId.toString(),payoutAccountId:row.payoutAccountId.toString()};}
}
