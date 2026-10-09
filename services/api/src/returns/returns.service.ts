import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { InventoryTransaction } from '../inventory/inventory-transaction.schema';
import { Inventory } from '../inventory/inventory.schema';
import { Order, OrderItem, OrderStatusHistory, SubOrder } from '../orders/order.schema';
import { Payment } from '../payments/payment.schema';
import { Shop } from '../shops/shop.schema';
import { CreateDisputeDto, CreateReturnDto, FailRefundDto, ListDisputesDto, ListRefundsDto, ListReturnsDto, ProcessRefundDto, ResolveDisputeDto, ReturnShipmentDto, SellerDecisionDto, SellerRejectDto } from './returns.dto';
import { Dispute, Refund, ReturnRequest } from './return.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { FinanceService } from '../finance/finance.service';
import { ShopAccessService } from '../access-control/shop-access.service';

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RETURN_ELIGIBLE_SUB_STATUSES = ['DELIVERED','COMPLETED'];
const OPEN_RETURN_STATUSES = ['REQUESTED','APPROVED','RETURN_SHIPPED','RETURN_RECEIVED','REFUND_PENDING','REFUNDED','DISPUTED'];

@Injectable()
export class ReturnsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(ReturnRequest.name) private readonly returns: Model<ReturnRequest>,
    @InjectModel(Refund.name) private readonly refunds: Model<Refund>,
    @InjectModel(Dispute.name) private readonly disputes: Model<Dispute>,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(SubOrder.name) private readonly subOrders: Model<SubOrder>,
    @InjectModel(OrderItem.name) private readonly orderItems: Model<OrderItem>,
    @InjectModel(OrderStatusHistory.name) private readonly history: Model<OrderStatusHistory>,
    @InjectModel(Inventory.name) private readonly inventories: Model<Inventory>,
    @InjectModel(InventoryTransaction.name) private readonly inventoryTransactions: Model<InventoryTransaction>,
    @InjectModel(Payment.name) private readonly payments: Model<Payment>,
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    private readonly notifications: NotificationsService,
    private readonly finance: FinanceService,
    private readonly shopAccess: ShopAccessService,
  ) {}

  private oid(id: string) { return new Types.ObjectId(id); }
  private code(prefix: string) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0,6).toUpperCase()}`; }
  private page(dto: {page?: number; limit?: number}) { return { page: dto.page || 1, limit: dto.limit || 20 }; }

  private async buyerSub(userId: string, subOrderCode: string, session?: ClientSession) {
    const subQuery = this.subOrders.findOne({ subOrderCode });
    if (session) subQuery.session(session);
    const sub = await subQuery.lean<any>();
    if (!sub) throw new NotFoundException('SUB_ORDER_NOT_FOUND');
    const orderQuery = this.orders.findOne({ _id: sub.orderId, buyerId: this.oid(userId) });
    if (session) orderQuery.session(session);
    const order = await orderQuery.lean<any>();
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    return { order, sub };
  }

  private assertWindow(sub: any, order: any) {
    if (!RETURN_ELIGIBLE_SUB_STATUSES.includes(sub.status)) throw new ConflictException('RETURN_NOT_AVAILABLE_FOR_STATUS');
    const anchor = new Date(sub.deliveredAt || order.completedAt || sub.updatedAt || order.updatedAt).getTime();
    if (!anchor || Date.now() - anchor > RETURN_WINDOW_MS) throw new ConflictException('RETURN_WINDOW_EXPIRED');
  }

  async eligibility(userId: string, subOrderCode: string) {
    const { order, sub } = await this.buyerSub(userId, subOrderCode);
    this.assertWindow(sub, order);
    const [items, existing] = await Promise.all([
      this.orderItems.find({ subOrderId: sub._id }).lean<any[]>(),
      this.returns.find({ subOrderId: sub._id, status: { $in: OPEN_RETURN_STATUSES } }).lean<any[]>(),
    ]);
    const already = new Map<string, number>();
    for (const r of existing) for (const line of r.items || []) already.set(String(line.orderItemId), (already.get(String(line.orderItemId)) || 0) + Number(line.quantity || 0));
    return {
      orderCode: order.orderCode, subOrderCode: sub.subOrderCode, status: sub.status,
      deadline: new Date(new Date(sub.deliveredAt || order.completedAt || sub.updatedAt).getTime() + RETURN_WINDOW_MS),
      items: items.map(item => ({ ...item, _id: item._id.toString(), returnableQuantity: Math.max(0, item.quantity - (already.get(item._id.toString()) || 0)) })),
    };
  }

  async createReturn(userId: string, dto: CreateReturnDto) {
    const session = await this.connection.startSession(); let notifySeller=''; let notifyOrder='';
    try {
      let response: any;
      await session.withTransaction(async () => {
        const { order, sub } = await this.buyerSub(userId, dto.subOrderCode, session);
        this.assertWindow(sub, order);
        const orderItems = await this.orderItems.find({ subOrderId: sub._id }).session(session).lean<any[]>();
        const itemMap = new Map(orderItems.map(item => [item._id.toString(), item]));
        const existing = await this.returns.find({ subOrderId: sub._id, status: { $in: OPEN_RETURN_STATUSES } }).session(session).lean<any[]>();
        const already = new Map<string, number>();
        for (const r of existing) for (const line of r.items || []) already.set(String(line.orderItemId), (already.get(String(line.orderItemId)) || 0) + Number(line.quantity || 0));
        const seen = new Set<string>();
        const selected: any[] = [];
        let gross = 0;
        for (const input of dto.items) {
          if (seen.has(input.orderItemId)) throw new ConflictException('DUPLICATE_RETURN_ITEM');
          seen.add(input.orderItemId);
          const item = itemMap.get(input.orderItemId);
          if (!item) throw new ConflictException('RETURN_ITEM_NOT_IN_SUB_ORDER');
          const availableQty = item.quantity - (already.get(input.orderItemId) || 0);
          if (input.quantity > availableQty) throw new ConflictException('RETURN_QUANTITY_EXCEEDS_PURCHASED');
          const grossAmount = item.unitPrice * input.quantity;
          const quantityRatio = item.quantity > 0 ? input.quantity / item.quantity : 0;
          const sellerLiabilityAmount = Math.max(0, Math.round((item.totalPrice - Number(item.shopVoucherDiscount || 0)) * quantityRatio));
          const refundableAmount = item.buyerPaidProductAmount !== undefined
            ? Math.max(0, Math.round(Number(item.buyerPaidProductAmount || 0) * quantityRatio))
            : sellerLiabilityAmount;
          gross += grossAmount;
          selected.push({
            orderItemId: item._id, variantId: item.variantId, productName: item.productName, image: item.image || '',
            variantSnapshot: item.variantSnapshot || {}, quantity: input.quantity, unitPrice: item.unitPrice, grossAmount, refundableAmount, sellerLiabilityAmount,
          });
        }
        if (!selected.length) throw new ConflictException('RETURN_ITEMS_REQUIRED');
        // New orders snapshot exact buyer-paid and seller-liability amounts per OrderItem.
        // The fallback below preserves compatibility with older seeded/orders that predate promotion snapshots.
        const hasExactSnapshots = orderItems.every(item => item.buyerPaidProductAmount !== undefined);
        let refundAmount = 0;
        let sellerLiabilityAmount = 0;
        if (hasExactSnapshots) {
          for (const line of selected) { refundAmount += line.refundableAmount; sellerLiabilityAmount += line.sellerLiabilityAmount; }
        } else {
          const platformProductDiscount = Number(order.platformProductDiscount ?? order.platformDiscount ?? 0);
          const shopVoucherDiscount = Number(sub.voucherDiscount || 0);
          const masterShopVoucherDiscount = Math.max(0, Number(order.sellerDiscount || 0) - Number(order.campaignDiscount || 0));
          const allMerchAfterShop = Math.max(0, Number(order.subtotal || 0) - masterShopVoucherDiscount);
          const subMerchAfterShop = Math.max(0, Number(sub.subtotal || 0) - shopVoucherDiscount);
          const allocatedPlatform = allMerchAfterShop > 0 ? Math.min(subMerchAfterShop, Math.round(platformProductDiscount * subMerchAfterShop / allMerchAfterShop)) : 0;
          const buyerRatio = Number(sub.subtotal || 0) > 0 ? Math.max(0, subMerchAfterShop - allocatedPlatform) / Number(sub.subtotal) : 1;
          const sellerRatio = Number(sub.subtotal || 0) > 0 ? subMerchAfterShop / Number(sub.subtotal) : 1;
          for (const line of selected) {
            line.refundableAmount = Math.max(0, Math.round(line.grossAmount * buyerRatio));
            line.sellerLiabilityAmount = Math.max(0, Math.round(line.grossAmount * sellerRatio));
            refundAmount += line.refundableAmount; sellerLiabilityAmount += line.sellerLiabilityAmount;
          }
        }
        const fullSubOrderReturn = orderItems.every(item => (already.get(item._id.toString()) || 0) + (selected.find(line => String(line.orderItemId) === item._id.toString())?.quantity || 0) === item.quantity);
        const requestCode = this.code('RET');
        const [created] = await this.returns.create([{
          requestCode, orderId: order._id, subOrderId: sub._id, buyerId: this.oid(userId), shopId: sub.shopId, sellerId: sub.sellerId,
          orderCode: order.orderCode, subOrderCode: sub.subOrderCode, reason: dto.reason, detail: (dto.detail || '').trim(), evidenceUrls: dto.evidenceUrls || [],
          items: selected, grossAmount: gross, refundAmount, sellerLiabilityAmount, fullSubOrderReturn, status: 'REQUESTED', sourceSubOrderStatus: sub.status, requestedAt: new Date(),
        }], { session });
        if (fullSubOrderReturn) {
          const changed = await this.subOrders.updateOne({ _id: sub._id, status: sub.status }, { $set: { status: 'RETURN_REQUESTED' } }, { session });
          if (changed.modifiedCount !== 1) throw new ConflictException('RETURN_CONCURRENT_UPDATE');
          await this.history.create([{ orderId: order._id, subOrderId: sub._id, fromStatus: sub.status, toStatus: 'RETURN_REQUESTED', changedBy: this.oid(userId), note: `Return ${requestCode}: ${dto.reason}` }], { session });
          await this.setMasterIfSingle(order._id, order.status, 'RETURN_REQUESTED', this.oid(userId), session, `Return ${requestCode} requested`);
        }
        notifySeller=sub.sellerId.toString(); notifyOrder=order.orderCode;
        response = { requestCode: created.requestCode, status: created.status, refundAmount: created.refundAmount, fullSubOrderReturn };
      });
      if(notifySeller)await this.notifications.createSafe({userId:notifySeller,type:'RETURN',title:'Buyer vừa yêu cầu trả hàng',body:`${response.requestCode} · đơn ${notifyOrder}`,data:{requestCode:response.requestCode,returnCode:response.requestCode,orderCode:notifyOrder}});
      return response;
    } finally { await session.endSession(); }
  }

  private async setMasterIfSingle(orderId: Types.ObjectId, currentStatus: string, targetStatus: string, actorId: Types.ObjectId, session: ClientSession, note: string) {
    const count = await this.subOrders.countDocuments({ orderId }).session(session);
    if (count !== 1 || currentStatus === targetStatus) return;
    const result = await this.orders.updateOne({ _id: orderId, status: currentStatus }, { $set: { status: targetStatus } }, { session });
    if (result.modifiedCount) await this.history.create([{ orderId, fromStatus: currentStatus, toStatus: targetStatus, changedBy: actorId, note }], { session });
  }

  private async decorate(row: any) {
    const [shop, refund, dispute] = await Promise.all([
      this.shops.findById(row.shopId).select({ name:1, slug:1, verified:1 }).lean<any>(),
      this.refunds.findOne({ returnRequestId: row._id }).lean<any>(),
      this.disputes.findOne({ returnRequestId: row._id }).sort({ createdAt: -1 }).lean<any>(),
    ]);
    return { ...row, _id: row._id.toString(), shop: shop ? { ...shop, _id: shop._id.toString() } : null, refund, dispute };
  }

  async listBuyer(userId: string, dto: ListReturnsDto) {
    const { page, limit } = this.page(dto); const filter: any = { buyerId: this.oid(userId) }; if (dto.status) filter.status = dto.status;
    const [rows,total] = await Promise.all([this.returns.find(filter).sort({ createdAt:-1 }).skip((page-1)*limit).limit(limit).lean<any[]>(), this.returns.countDocuments(filter)]);
    return { items: await Promise.all(rows.map(r => this.decorate(r))), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total/limit)) } };
  }
  async listSeller(userId: string, dto: ListReturnsDto) {
    const access=await this.shopAccess.resolve(userId,true); const { page, limit } = this.page(dto); const filter: any = { shopId: access.shopId }; if (dto.status) filter.status = dto.status;
    const [rows,total] = await Promise.all([this.returns.find(filter).sort({ createdAt:-1 }).skip((page-1)*limit).limit(limit).lean<any[]>(), this.returns.countDocuments(filter)]);
    return { items: await Promise.all(rows.map(r => this.decorate(r))), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total/limit)) } };
  }
  async getBuyer(userId: string, code: string) { const row = await this.returns.findOne({ requestCode: code, buyerId: this.oid(userId) }).lean<any>(); if (!row) throw new NotFoundException('RETURN_NOT_FOUND'); return this.decorate(row); }
  async getSeller(userId: string, code: string) { const access=await this.shopAccess.resolve(userId,true); const row = await this.returns.findOne({ requestCode: code, shopId: access.shopId }).lean<any>(); if (!row) throw new NotFoundException('RETURN_NOT_FOUND'); return this.decorate(row); }

  async sellerApprove(userId: string, code: string, dto: SellerDecisionDto) {
    const session = await this.connection.startSession(); try { let out:any; await session.withTransaction(async()=>{
      const access=await this.shopAccess.resolve(userId,true);const row=await this.returns.findOne({requestCode:code,shopId:access.shopId}).session(session).lean<any>(); if(!row)throw new NotFoundException('RETURN_NOT_FOUND'); if(row.status!=='REQUESTED')throw new ConflictException('RETURN_NOT_AWAITING_SELLER');
      const now=new Date(); await this.returns.updateOne({_id:row._id,status:'REQUESTED'},{$set:{status:'APPROVED',sellerNote:(dto.note||'').trim(),decisionSource:'SELLER',decidedAt:now}},{session});
      if(row.fullSubOrderReturn){
        await this.subOrders.updateOne({_id:row.subOrderId},{$set:{status:'RETURN_APPROVED'}},{session});
        const order=await this.orders.findById(row.orderId).session(session).lean<any>(); if(order)await this.setMasterIfSingle(order._id,order.status,'RETURN_APPROVED',this.oid(userId),session,`Return ${code} approved`);
        await this.history.create([{orderId:row.orderId,subOrderId:row.subOrderId,fromStatus:'RETURN_REQUESTED',toStatus:'RETURN_APPROVED',changedBy:this.oid(userId),note:dto.note||`Seller approved ${code}`}],{session});
      } out={requestCode:code,status:'APPROVED'};
    }); const row=await this.returns.findOne({requestCode:code}).lean<any>();if(row)await this.notifications.createSafe({userId:row.buyerId.toString(),type:'RETURN',title:'Shop đã chấp nhận trả hàng',body:`Yêu cầu ${code} đã được duyệt.`,data:{requestCode:code,returnCode:code,orderCode:row.orderCode}}); return out; } finally { await session.endSession(); }
  }

  async sellerReject(userId: string, code: string, dto: SellerRejectDto) {
    const session=await this.connection.startSession(); try{let out:any;await session.withTransaction(async()=>{
      const access=await this.shopAccess.resolve(userId,true);const row=await this.returns.findOne({requestCode:code,shopId:access.shopId}).session(session).lean<any>();if(!row)throw new NotFoundException('RETURN_NOT_FOUND');if(row.status!=='REQUESTED')throw new ConflictException('RETURN_NOT_AWAITING_SELLER');
      await this.returns.updateOne({_id:row._id,status:'REQUESTED'},{$set:{status:'REJECTED',rejectionReason:dto.reason.trim(),decisionSource:'SELLER',decidedAt:new Date()}},{session});
      if(row.fullSubOrderReturn){
        await this.subOrders.updateOne({_id:row.subOrderId},{$set:{status:row.sourceSubOrderStatus}},{session});
        const order=await this.orders.findById(row.orderId).session(session).lean<any>();if(order)await this.setMasterIfSingle(order._id,order.status,row.sourceSubOrderStatus,this.oid(userId),session,`Return ${code} rejected`);
        await this.history.create([{orderId:row.orderId,subOrderId:row.subOrderId,fromStatus:'RETURN_REQUESTED',toStatus:row.sourceSubOrderStatus,changedBy:this.oid(userId),note:`Return rejected: ${dto.reason}`}],{session});
      }out={requestCode:code,status:'REJECTED'};
    });const row=await this.returns.findOne({requestCode:code}).lean<any>();if(row)await this.notifications.createSafe({userId:row.buyerId.toString(),type:'RETURN',title:'Shop từ chối yêu cầu trả hàng',body:`Yêu cầu ${code} đã bị từ chối.`,data:{requestCode:code,returnCode:code,orderCode:row.orderCode}});return out;}finally{await session.endSession();}
  }

  async submitShipment(userId:string,code:string,dto:ReturnShipmentDto){
    const session=await this.connection.startSession();try{let out:any;await session.withTransaction(async()=>{
      const row=await this.returns.findOne({requestCode:code,buyerId:this.oid(userId)}).session(session).lean<any>();if(!row)throw new NotFoundException('RETURN_NOT_FOUND');if(row.status!=='APPROVED')throw new ConflictException('RETURN_NOT_APPROVED');
      await this.returns.updateOne({_id:row._id,status:'APPROVED'},{$set:{status:'RETURN_SHIPPED',returnShippingProvider:dto.provider.trim(),returnTrackingCode:dto.trackingCode.trim(),returnShippedAt:new Date()}},{session});
      if(row.fullSubOrderReturn){
        await this.subOrders.updateOne({_id:row.subOrderId},{$set:{status:'RETURNED'}},{session});const order=await this.orders.findById(row.orderId).session(session).lean<any>();if(order)await this.setMasterIfSingle(order._id,order.status,'RETURNED',this.oid(userId),session,`Buyer shipped return ${code}`);
        await this.history.create([{orderId:row.orderId,subOrderId:row.subOrderId,fromStatus:'RETURN_APPROVED',toStatus:'RETURNED',changedBy:this.oid(userId),note:`Return shipment ${dto.provider}: ${dto.trackingCode}`}],{session});
      }out={requestCode:code,status:'RETURN_SHIPPED'};
    });const row=await this.returns.findOne({requestCode:code}).lean<any>();if(row)await this.notifications.createSafe({userId:row.sellerId.toString(),type:'RETURN',title:'Buyer đã gửi hàng trả',body:`${code} · ${dto.provider} ${dto.trackingCode}`,data:{requestCode:code,returnCode:code,orderCode:row.orderCode}});return out;}finally{await session.endSession();}
  }

  async sellerReceived(userId:string,code:string,dto:SellerDecisionDto){
    const session=await this.connection.startSession();try{let out:any;await session.withTransaction(async()=>{
      const access=await this.shopAccess.resolve(userId,true);const row=await this.returns.findOne({requestCode:code,shopId:access.shopId}).session(session).lean<any>();if(!row)throw new NotFoundException('RETURN_NOT_FOUND');if(row.status!=='RETURN_SHIPPED')throw new ConflictException('RETURN_NOT_SHIPPED');
      const order=await this.orders.findById(row.orderId).session(session).lean<any>();if(!order)throw new NotFoundException('ORDER_NOT_FOUND');
      const now=new Date();await this.returns.updateOne({_id:row._id,status:'RETURN_SHIPPED'},{$set:{status:'REFUND_PENDING',returnReceivedAt:now,sellerNote:(dto.note||row.sellerNote||'').trim()}},{session});
      const existing=await this.refunds.findOne({returnRequestId:row._id}).session(session).lean<any>();let refund=existing;
      if(!existing){const [r]=await this.refunds.create([{refundCode:this.code('RF'),returnRequestId:row._id,orderId:row.orderId,buyerId:row.buyerId,shopId:row.shopId,amount:row.refundAmount,method:order.paymentMethod==='COD'?'MANUAL_COD':'ORIGINAL_GATEWAY',provider:order.paymentMethod==='COD'?'':order.paymentMethod,status:'PENDING'}],{session});refund=r;}
      if(row.fullSubOrderReturn){
        await this.subOrders.updateOne({_id:row.subOrderId},{$set:{status:'REFUND_PENDING'}},{session});await this.setMasterIfSingle(order._id,order.status,'REFUND_PENDING',this.oid(userId),session,`Return ${code} received; refund pending`);
        await this.history.create([{orderId:row.orderId,subOrderId:row.subOrderId,fromStatus:'RETURNED',toStatus:'REFUND_PENDING',changedBy:this.oid(userId),note:dto.note||`Seller received returned parcel ${code}`}],{session});
      }out={requestCode:code,status:'REFUND_PENDING',refundCode:refund.refundCode};
    });const row=await this.returns.findOne({requestCode:code}).lean<any>();if(row)await this.notifications.createSafe({userId:row.buyerId.toString(),type:'REFUND',title:'Shop đã nhận hàng trả',body:`${code} đang chờ hoàn tiền.`,data:{requestCode:code,returnCode:code,orderCode:row.orderCode,refundCode:out.refundCode}});return out;}finally{await session.endSession();}
  }

  async openDispute(userId:string,code:string,dto:CreateDisputeDto){
    const session=await this.connection.startSession();try{let out:any;await session.withTransaction(async()=>{
      const row=await this.returns.findOne({requestCode:code,buyerId:this.oid(userId)}).session(session).lean<any>();if(!row)throw new NotFoundException('RETURN_NOT_FOUND');
      const staleRequested=row.status==='REQUESTED' && Date.now()-new Date(row.requestedAt).getTime()>48*3600000;if(row.status!=='REJECTED'&&!staleRequested)throw new ConflictException('DISPUTE_NOT_AVAILABLE');
      const existing=await this.disputes.findOne({returnRequestId:row._id,status:{$in:['OPEN','UNDER_REVIEW']}}).session(session).lean<any>();if(existing)throw new ConflictException('DISPUTE_ALREADY_OPEN');
      const [d]=await this.disputes.create([{disputeCode:this.code('DSP'),returnRequestId:row._id,orderId:row.orderId,buyerId:row.buyerId,shopId:row.shopId,sellerId:row.sellerId,reason:dto.reason.trim(),detail:(dto.detail||'').trim(),status:'OPEN'}],{session});
      await this.returns.updateOne({_id:row._id},{$set:{status:'DISPUTED'}},{session});if(row.fullSubOrderReturn){await this.subOrders.updateOne({_id:row.subOrderId},{$set:{status:'DISPUTED'}},{session});const order=await this.orders.findById(row.orderId).session(session).lean<any>();if(order)await this.setMasterIfSingle(order._id,order.status,'DISPUTED',this.oid(userId),session,`Dispute ${d.disputeCode} opened`);
      await this.history.create([{orderId:row.orderId,subOrderId:row.subOrderId,fromStatus:row.status==='REJECTED'?row.sourceSubOrderStatus:'RETURN_REQUESTED',toStatus:'DISPUTED',changedBy:this.oid(userId),note:`Dispute ${d.disputeCode}: ${dto.reason}`}],{session});}out={disputeCode:d.disputeCode,status:d.status};
    });return out;}finally{await session.endSession();}
  }

  async adminSummary(){
    const [returnRows,refundRows,disputeRows]=await Promise.all([
      this.returns.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),this.refunds.aggregate([{$group:{_id:'$status',count:{$sum:1},amount:{$sum:'$amount'}}}]),this.disputes.aggregate([{$group:{_id:'$status',count:{$sum:1}}}])
    ]);return {returns:Object.fromEntries(returnRows.map((r:any)=>[r._id,r.count])),refunds:Object.fromEntries(refundRows.map((r:any)=>[r._id,{count:r.count,amount:r.amount}])),disputes:Object.fromEntries(disputeRows.map((r:any)=>[r._id,r.count]))};
  }

  async listDisputes(dto:ListDisputesDto){const {page,limit}=this.page(dto);const filter:any={};if(dto.status)filter.status=dto.status;const [rows,total]=await Promise.all([this.disputes.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.disputes.countDocuments(filter)]);const items=await Promise.all(rows.map(async d=>{const r=await this.returns.findById(d.returnRequestId).lean<any>();const shop=r?await this.shops.findById(r.shopId).select({name:1,slug:1}).lean<any>():null;return{...d,_id:d._id.toString(),returnRequest:r,shop};}));return{items,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};}
  async getDispute(code:string){const d=await this.disputes.findOne({disputeCode:code}).lean<any>();if(!d)throw new NotFoundException('DISPUTE_NOT_FOUND');const r=await this.returns.findById(d.returnRequestId).lean<any>();return{...d,returnRequest:r?await this.decorate(r):null};}

  async resolveDispute(adminId:string,code:string,dto:ResolveDisputeDto){
    const session=await this.connection.startSession();try{let out:any;await session.withTransaction(async()=>{
      const d=await this.disputes.findOne({disputeCode:code,status:{$in:['OPEN','UNDER_REVIEW']}}).session(session).lean<any>();if(!d)throw new NotFoundException('OPEN_DISPUTE_NOT_FOUND');const r=await this.returns.findById(d.returnRequestId).session(session).lean<any>();if(!r)throw new NotFoundException('RETURN_NOT_FOUND');const target=dto.outcome==='BUYER'?'RESOLVED_BUYER':'RESOLVED_SELLER';
      await this.disputes.updateOne({_id:d._id},{$set:{status:target,resolutionNote:dto.note.trim(),resolvedBy:this.oid(adminId),resolvedAt:new Date()}},{session});const returnStatus=dto.outcome==='BUYER'?'APPROVED':'REJECTED';await this.returns.updateOne({_id:r._id},{$set:{status:returnStatus,decisionSource:'ADMIN',sellerNote:dto.outcome==='BUYER'?dto.note:r.sellerNote,rejectionReason:dto.outcome==='SELLER'?dto.note:r.rejectionReason,decidedAt:new Date()}},{session});
      const subStatus=dto.outcome==='BUYER'?'RETURN_APPROVED':r.sourceSubOrderStatus;if(r.fullSubOrderReturn){await this.subOrders.updateOne({_id:r.subOrderId},{$set:{status:subStatus}},{session});const order=await this.orders.findById(r.orderId).session(session).lean<any>();if(order)await this.setMasterIfSingle(order._id,order.status,subStatus,this.oid(adminId),session,`Admin resolved ${code} for ${dto.outcome}`);
      await this.history.create([{orderId:r.orderId,subOrderId:r.subOrderId,fromStatus:'DISPUTED',toStatus:subStatus,changedBy:this.oid(adminId),note:`Dispute ${code}: ${dto.note}`}],{session});}out={disputeCode:code,status:target,returnStatus};
    });return out;}finally{await session.endSession();}
  }

  async listRefunds(dto:ListRefundsDto){const {page,limit}=this.page(dto);const filter:any={};if(dto.status)filter.status=dto.status;const [rows,total]=await Promise.all([this.refunds.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.refunds.countDocuments(filter)]);const items=await Promise.all(rows.map(async f=>{const r=await this.returns.findById(f.returnRequestId).lean<any>();return{...f,_id:f._id.toString(),returnRequest:r?await this.decorate(r):null};}));return{items,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};}
  async startRefund(adminId:string,code:string){const updated=await this.refunds.findOneAndUpdate({refundCode:code,status:{$in:['PENDING','FAILED']}},{$set:{status:'PROCESSING',processedBy:this.oid(adminId),processedAt:new Date()}},{new:true}).lean<any>();if(!updated)throw new ConflictException('REFUND_NOT_STARTABLE');return updated;}
  async failRefund(adminId:string,code:string,dto:FailRefundDto){const updated=await this.refunds.findOneAndUpdate({refundCode:code,status:'PROCESSING'},{$set:{status:'FAILED',note:dto.reason.trim(),processedBy:this.oid(adminId),processedAt:new Date()}},{new:true}).lean<any>();if(!updated)throw new ConflictException('REFUND_NOT_PROCESSING');return updated;}

  async confirmRefund(adminId:string,code:string,dto:ProcessRefundDto){
    const session=await this.connection.startSession();try{let out:any;await session.withTransaction(async()=>{
      const refund=await this.refunds.findOne({refundCode:code,status:'PROCESSING'}).session(session).lean<any>();if(!refund)throw new ConflictException('REFUND_NOT_PROCESSING');const r=await this.returns.findById(refund.returnRequestId).session(session).lean<any>();if(!r)throw new NotFoundException('RETURN_NOT_FOUND');if(r.status!=='REFUND_PENDING')throw new ConflictException('RETURN_NOT_REFUND_PENDING');
      for(const line of r.items||[]){let inventory:any;if(r.sourceSubOrderStatus==='COMPLETED')inventory=await this.inventories.findOneAndUpdate({variantId:line.variantId,sold:{$gte:line.quantity}},{$inc:{sold:-line.quantity,available:line.quantity}},{session,new:true}).lean<any>();else inventory=await this.inventories.findOneAndUpdate({variantId:line.variantId,reserved:{$gte:line.quantity}},{$inc:{reserved:-line.quantity,available:line.quantity}},{session,new:true}).lean<any>();if(!inventory)throw new ConflictException('RETURN_INVENTORY_RESTORE_FAILED');await this.inventoryTransactions.create([{shopId:r.shopId,variantId:line.variantId,type:'RETURN',quantity:line.quantity,referenceType:'RETURN',referenceId:r._id,beforeQuantity:inventory.available-line.quantity,afterQuantity:inventory.available,createdBy:this.oid(adminId),note:`Refund ${code} confirmed`}],{session});}
      await this.refunds.updateOne({_id:refund._id},{$set:{status:'SUCCEEDED',externalReference:dto.externalReference.trim(),note:(dto.note||'').trim(),processedBy:this.oid(adminId),processedAt:new Date()}},{session});await this.returns.updateOne({_id:r._id},{$set:{status:'REFUNDED',refundedAt:new Date()}},{session});if(r.fullSubOrderReturn)await this.subOrders.updateOne({_id:r.subOrderId},{$set:{status:'REFUNDED'}},{session});
      const order=await this.orders.findById(r.orderId).session(session).lean<any>();if(!order)throw new NotFoundException('ORDER_NOT_FOUND');const newRefunded=Number(order.refundedAmount||0)+refund.amount;const orderPaymentStatus=newRefunded>=order.totalAmount?'REFUNDED':'PARTIALLY_REFUNDED';await this.orders.updateOne({_id:order._id},{$set:{refundedAmount:newRefunded,paymentStatus:orderPaymentStatus}},{session});
      const payment=await this.payments.findOne({orderId:order._id,status:{$in:['SUCCESS','PARTIALLY_REFUNDED']}}).sort({createdAt:-1}).session(session).lean<any>();if(payment){const paymentRefunded=Number(payment.refundedAmount||0)+refund.amount;await this.payments.updateOne({_id:payment._id},{$set:{refundedAmount:paymentRefunded,status:paymentRefunded>=payment.amount?'REFUNDED':'PARTIALLY_REFUNDED'}},{session});}
      await this.finance.recordRefund(refund,r,session);
      if(r.fullSubOrderReturn){await this.setMasterIfSingle(order._id,order.status,'REFUNDED',this.oid(adminId),session,`Refund ${code} confirmed`);await this.history.create([{orderId:r.orderId,subOrderId:r.subOrderId,fromStatus:'REFUND_PENDING',toStatus:'REFUNDED',changedBy:this.oid(adminId),note:`Refund ${code} confirmed: ${dto.externalReference}`}],{session});}out={refundCode:code,status:'SUCCEEDED',returnStatus:'REFUNDED',amount:refund.amount,orderPaymentStatus};
    });const refundRow=await this.refunds.findOne({refundCode:code}).lean<any>();if(refundRow)await this.notifications.createSafe({userId:refundRow.buyerId.toString(),type:'REFUND',title:'Hoàn tiền thành công',body:`${code} · ${new Intl.NumberFormat('vi-VN').format(refundRow.amount)}₫`,data:{refundCode:code}});return out;}finally{await session.endSession();}
  }
}
