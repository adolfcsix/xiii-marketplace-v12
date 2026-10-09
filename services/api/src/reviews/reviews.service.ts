import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { User } from '../auth/user.schema';
import { Order, OrderItem, SubOrder } from '../orders/order.schema';
import { Product } from '../products/product.schema';
import { Shop } from '../shops/shop.schema';
import { CreateReviewDto, ListAdminReviewsDto, ListBuyerReviewsDto, ListPublicReviewsDto, ListSellerReviewsDto, ModerateReviewDto, SellerReplyDto } from './reviews.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CustomerReview } from './customer-review.schema';
import { ShopAccessService } from '../access-control/shop-access.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(CustomerReview.name) private readonly reviews: Model<CustomerReview>,
    @InjectModel(Order.name) private readonly orders: Model<Order>,
    @InjectModel(SubOrder.name) private readonly subOrders: Model<SubOrder>,
    @InjectModel(OrderItem.name) private readonly orderItems: Model<OrderItem>,
    @InjectModel(Product.name) private readonly products: Model<Product>,
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly notifications: NotificationsService,
    private readonly shopAccess: ShopAccessService,
  ) {}

  private oid(id: string) { if (!Types.ObjectId.isValid(id)) throw new BadRequestException('INVALID_ID'); return new Types.ObjectId(id); }
  private page(dto: {page?:number;limit?:number}) { return { page: Math.max(1,dto.page||1), limit: Math.min(100,Math.max(1,dto.limit||20)) }; }

  private async recalcProduct(productId: Types.ObjectId, session?: ClientSession) {
    const agg = this.reviews.aggregate([
      { $match: { productId, status: 'PUBLISHED' } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (session) agg.session(session);
    const [row] = await agg;
    await this.products.updateOne({ _id: productId }, { $set: { ratingAverage: row ? Math.round(row.average * 10) / 10 : 0, ratingCount: row?.count || 0 } }, { session });
  }

  private async recalcShop(shopId: Types.ObjectId, session?: ClientSession) {
    const agg = this.reviews.aggregate([
      { $match: { shopId, status: 'PUBLISHED' } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (session) agg.session(session);
    const [row] = await agg;
    await this.shops.updateOne({ _id: shopId }, { $set: { ratingAverage: row ? Math.round(row.average * 10) / 10 : 0, ratingCount: row?.count || 0 } }, { session });
  }

  async create(userId: string, dto: CreateReviewDto) {
    const buyerId = this.oid(userId); const itemId = this.oid(dto.orderItemId);
    const session = await this.connection.startSession();
    try {
      let out: any;
      await session.withTransaction(async () => {
        const item = await this.orderItems.findById(itemId).session(session).lean<any>();
        if (!item) throw new NotFoundException('ORDER_ITEM_NOT_FOUND');
        const order = await this.orders.findOne({ _id: item.orderId, buyerId }).session(session).lean<any>();
        if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
        if (order.status !== 'COMPLETED') throw new ConflictException('VERIFIED_PURCHASE_NOT_COMPLETED');
        const sub = await this.subOrders.findOne({ _id: item.subOrderId, orderId: order._id }).session(session).lean<any>();
        if (!sub || sub.status !== 'COMPLETED') throw new ConflictException('SUB_ORDER_NOT_COMPLETED');
        if (await this.reviews.exists({ orderItemId: item._id, buyerId }).session(session)) throw new ConflictException('REVIEW_ALREADY_EXISTS');
        const [review] = await this.reviews.create([{
          orderId: order._id, subOrderId: sub._id, orderItemId: item._id, buyerId, shopId: item.shopId,
          sellerId: sub.sellerId, productId: item.productId, variantId: item.variantId, rating: dto.rating,
          comment: (dto.comment || '').trim(), media: dto.media || [], verifiedPurchase: true, status: 'PUBLISHED',
        }], { session });
        await this.recalcProduct(item.productId, session); await this.recalcShop(item.shopId, session);
        out = review.toObject();
      });
      if (out?.sellerId) { const product = await this.products.findById(out.productId).select({ name: 1 }).lean<any>(); await this.notifications.createSafe({ userId: out.sellerId.toString(), type: 'REVIEW', title: 'Bạn có đánh giá mới', body: `${out.rating}★ · ${product?.name || 'Sản phẩm'}`, data: { reviewId: out._id?.toString?.(), productId: out.productId?.toString?.() } }); }
      return out;
    } finally { await session.endSession(); }
  }

  async buyerList(userId: string, dto: ListBuyerReviewsDto) {
    const buyerId = this.oid(userId); const {page,limit}=this.page(dto);
    if (dto.status === 'PENDING') {
      const completed = await this.orders.find({ buyerId, status: 'COMPLETED' }).select({_id:1,orderCode:1,completedAt:1}).sort({completedAt:-1}).lean<any[]>();
      const orderIds = completed.map(x=>x._id); if(!orderIds.length) return {items:[],meta:{page,limit,total:0,totalPages:1}};
      const [items,existing] = await Promise.all([
        this.orderItems.find({orderId:{$in:orderIds}}).sort({createdAt:-1}).lean<any[]>(),
        this.reviews.find({buyerId}).select({orderItemId:1}).lean<any[]>(),
      ]);
      const reviewed = new Set(existing.map(r=>r.orderItemId.toString()));
      const pending = items.filter(i=>!reviewed.has(i._id.toString()));
      const slice = pending.slice((page-1)*limit,page*limit);
      const productIds=[...new Set(slice.map(i=>i.productId.toString()))].map(id=>new Types.ObjectId(id));
      const products=productIds.length?await this.products.find({_id:{$in:productIds}}).select({name:1,slug:1,images:1}).lean<any[]>():[];
      const pm=new Map(products.map(p=>[p._id.toString(),p]));
      const om=new Map(completed.map(o=>[o._id.toString(),o]));
      return {items:slice.map(i=>({...i,_id:i._id.toString(),order:om.get(i.orderId.toString()),product:pm.get(i.productId.toString()),verifiedPurchase:true})),meta:{page,limit,total:pending.length,totalPages:Math.max(1,Math.ceil(pending.length/limit))}};
    }
    const filter:any={buyerId};
    const [rows,total]=await Promise.all([this.reviews.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.reviews.countDocuments(filter)]);
    return {items:await this.decorate(rows),meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
  }

  async publicList(productId: string, dto: ListPublicReviewsDto) {
    const pid=this.oid(productId); const {page,limit}=this.page(dto); const filter:any={productId:pid,status:'PUBLISHED'}; if(dto.rating)filter.rating=dto.rating;
    const [rows,total,dist]=await Promise.all([
      this.reviews.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),
      this.reviews.countDocuments(filter),
      this.reviews.aggregate([{$match:{productId:pid,status:'PUBLISHED'}},{$group:{_id:'$rating',count:{$sum:1}}}]),
    ]);
    const product=await this.products.findById(pid).select({ratingAverage:1,ratingCount:1}).lean<any>();
    return {items:await this.decorate(rows,true),summary:{average:product?.ratingAverage||0,count:product?.ratingCount||0,distribution:Object.fromEntries(dist.map((r:any)=>[r._id,r.count]))},meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
  }

  private async sellerShop(userId:string){const access=await this.shopAccess.resolve(userId,true);const shop=await this.shops.findById(access.shopId).lean<any>();if(!shop)throw new NotFoundException('ACTIVE_SHOP_NOT_FOUND');return shop;}
  async sellerList(userId:string,dto:ListSellerReviewsDto){const shop=await this.sellerShop(userId);const {page,limit}=this.page(dto);const filter:any={shopId:shop._id};if(dto.rating)filter.rating=dto.rating;if(dto.reply==='REPLIED')filter.sellerReply={$ne:''};if(dto.reply==='UNREPLIED')filter.$or=[{sellerReply:''},{sellerReply:{$exists:false}}];const [rows,total]=await Promise.all([this.reviews.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.reviews.countDocuments(filter)]);return{items:await this.decorate(rows),meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};}
  async sellerReply(userId:string,id:string,dto:SellerReplyDto){const shop=await this.sellerShop(userId);const row=await this.reviews.findOneAndUpdate({_id:this.oid(id),shopId:shop._id},{$set:{sellerReply:dto.reply.trim(),sellerRepliedAt:new Date()}},{new:true}).lean<any>();if(!row)throw new NotFoundException('REVIEW_NOT_FOUND');await this.notifications.createSafe({userId:row.buyerId.toString(),type:'REVIEW',title:'Shop đã phản hồi đánh giá',body:dto.reply.trim().slice(0,180),data:{reviewId:row._id.toString(),productId:row.productId.toString()}});return row;}

  async adminList(dto:ListAdminReviewsDto){const {page,limit}=this.page(dto);const filter:any={};if(dto.status)filter.status=dto.status;if(dto.rating)filter.rating=dto.rating;const [rows,total]=await Promise.all([this.reviews.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.reviews.countDocuments(filter)]);return{items:await this.decorate(rows),meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};}
  async moderate(adminId:string,id:string,dto:ModerateReviewDto){const session=await this.connection.startSession();try{let out:any;await session.withTransaction(async()=>{const row=await this.reviews.findById(this.oid(id)).session(session).lean<any>();if(!row)throw new NotFoundException('REVIEW_NOT_FOUND');if(dto.status==='HIDDEN'&&!dto.reason?.trim())throw new BadRequestException('MODERATION_REASON_REQUIRED');await this.reviews.updateOne({_id:row._id},{$set:{status:dto.status,moderationReason:(dto.reason||'').trim(),moderatedBy:this.oid(adminId),moderatedAt:new Date()}},{session});await this.recalcProduct(row.productId,session);await this.recalcShop(row.shopId,session);out={...row,status:dto.status,moderationReason:(dto.reason||'').trim()};});return out;}finally{await session.endSession();}}

  private async decorate(rows:any[],maskBuyer=false){if(!rows.length)return[];const userIds=[...new Set(rows.map(r=>r.buyerId.toString()))].map(id=>new Types.ObjectId(id));const productIds=[...new Set(rows.map(r=>r.productId.toString()))].map(id=>new Types.ObjectId(id));const shopIds=[...new Set(rows.map(r=>r.shopId.toString()))].map(id=>new Types.ObjectId(id));const [users,products,shops]=await Promise.all([this.users.find({_id:{$in:userIds}}).select({fullName:1,avatar:1}).lean<any[]>(),this.products.find({_id:{$in:productIds}}).select({name:1,slug:1,images:1}).lean<any[]>(),this.shops.find({_id:{$in:shopIds}}).select({name:1,slug:1,verified:1}).lean<any[]>()]);const um=new Map<string, any>(users.map(x=>[x._id.toString(),x]));const pm=new Map<string, any>(products.map(x=>[x._id.toString(),x]));const sm=new Map<string, any>(shops.map(x=>[x._id.toString(),x]));return rows.map(r=>{const user=um.get(r.buyerId.toString())||null;const buyer=user?(maskBuyer?{displayName:user.fullName?.length>2?user.fullName.slice(0,1)+'***'+user.fullName.slice(-1):'Buyer',avatar:user.avatar||''}:{fullName:user.fullName,avatar:user.avatar||''}):null;return {...r,_id:r._id.toString(),buyer,product:pm.get(r.productId.toString())||null,shop:sm.get(r.shopId.toString())||null};});}
}
