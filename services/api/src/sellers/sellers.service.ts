import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { SellerApplication } from './seller-application.schema';
import { ApplySellerDto, SellerApplicationQueryDto } from './sellers.dto';
import { Shop } from '../shops/shop.schema';
import { User } from '../auth/user.schema';
import { toSlug } from '../common/utils/slug';
import { ShopMember } from '../access-control/shop-member.schema';
import { SHOP_ROLE_DEFAULTS } from '../access-control/access.constants';

@Injectable()
export class SellersService {
  constructor(
    @InjectModel(SellerApplication.name) private readonly apps: Model<SellerApplication>,
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(ShopMember.name) private readonly members: Model<ShopMember>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  async apply(userId: string, dto: ApplySellerDto) {
    const existing = await this.apps.findOne({ userId });
    if (existing && !['REJECTED'].includes(existing.status)) throw new ConflictException('SELLER_APPLICATION_EXISTS');
    if (existing) {
      Object.assign(existing, dto, { status: 'PENDING', rejectionReason: undefined, reviewedAt: undefined, reviewedBy: undefined, submittedAt: new Date() });
      return existing.save();
    }
    return this.apps.create({ ...dto, userId: new Types.ObjectId(userId), status: 'PENDING', submittedAt: new Date() });
  }

  async mine(userId: string) { return this.apps.findOne({ userId }); }

  async list(query: SellerApplicationQueryDto) {
    const page = Number(query.page || 1); const limit = Number(query.limit || 20);
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      const rx = new RegExp(this.escapeRegex(query.search.trim()), 'i');
      const userIds = await this.users.find({ $or: [{ email: rx }, { fullName: rx }, { phone: rx }] }).distinct('_id');
      filter.$or = [{ shopName: rx }, { identityNumber: rx }, { userId: { $in: userIds } }];
    }
    const [rows, total] = await Promise.all([
      this.apps.find(filter).sort({ submittedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<any[]>(),
      this.apps.countDocuments(filter),
    ]);
    const users = rows.length ? await this.users.find({ _id: { $in: rows.map(x => x.userId) } }).select({ fullName: 1, email: 1, phone: 1, status: 1, createdAt: 1 }).lean<any[]>() : [];
    const map = new Map(users.map(u => [u._id.toString(), u]));
    return { items: rows.map(r => ({ ...r, user: map.get(r.userId.toString()) || null })), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async detail(id: Types.ObjectId) {
    const app = await this.apps.findById(id).lean<any>();
    if (!app) throw new NotFoundException('SELLER_APPLICATION_NOT_FOUND');
    const [user, existingShop] = await Promise.all([
      this.users.findById(app.userId).select({ fullName: 1, email: 1, phone: 1, status: 1, emailVerified: 1, phoneVerified: 1, roles: 1, createdAt: 1 }).lean<any>(),
      this.shops.findOne({ ownerId: app.userId }).select({ name: 1, slug: 1, status: 1, verified: 1 }).lean<any>(),
    ]);
    return { application: app, user, existingShop };
  }

  async markUnderReview(id: Types.ObjectId, adminId: string) {
    const app = await this.apps.findById(id);
    if (!app) throw new NotFoundException('SELLER_APPLICATION_NOT_FOUND');
    if (app.status !== 'PENDING') throw new BadRequestException('SELLER_APPLICATION_NOT_PENDING');
    app.status = 'UNDER_REVIEW'; app.reviewedBy = new Types.ObjectId(adminId); app.reviewedAt = new Date();
    return app.save();
  }

  async approve(id: Types.ObjectId, adminId: string) {
    const session = await this.connection.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const app = await this.apps.findById(id).session(session);
        if (!app) throw new NotFoundException('SELLER_APPLICATION_NOT_FOUND');
        if (app.status === 'APPROVED') {
          const shop = await this.shops.findOne({ ownerId: app.userId }).session(session);
          result = { application: app, shop, alreadyApproved: true }; return;
        }
        if (!['PENDING', 'UNDER_REVIEW'].includes(app.status)) throw new BadRequestException('SELLER_APPLICATION_NOT_REVIEWABLE');
        const user = await this.users.findById(app.userId).session(session);
        if (!user || user.status !== 'ACTIVE') throw new BadRequestException('SELLER_USER_NOT_ACTIVE');
        let shop = await this.shops.findOne({ ownerId: app.userId }).session(session);
        if (!shop) {
          let slug = toSlug(app.shopName); let suffix = 1;
          while (await this.shops.exists({ slug }).session(session)) slug = `${toSlug(app.shopName)}-${suffix++}`;
          shop = new this.shops({ ownerId: app.userId, name: app.shopName, slug, description: '', status: 'ACTIVE', verified: true, followerCount: 0, productCount: 0, ratingAverage: 0, ratingCount: 0, responseRate: 0 });
          await shop.save({ session });
        }
        await this.users.updateOne({ _id: app.userId }, { $addToSet: { roles: 'SELLER' } }, { session });
        await this.members.updateOne(
          { shopId: shop._id, userId: app.userId },
          { $setOnInsert: { role: 'OWNER', permissions: SHOP_ROLE_DEFAULTS.OWNER, status: 'ACTIVE', invitedBy: new Types.ObjectId(adminId), joinedAt: new Date() } },
          { upsert: true, session },
        );
        app.status = 'APPROVED'; app.reviewedAt = new Date(); app.reviewedBy = new Types.ObjectId(adminId); app.rejectionReason = undefined;
        await app.save({ session }); result = { application: app, shop };
      });
      return result;
    } finally { await session.endSession(); }
  }

  async reject(id: Types.ObjectId, adminId: string, reason?: string) {
    if (!reason?.trim()) throw new BadRequestException('REJECTION_REASON_REQUIRED');
    const app = await this.apps.findById(id);
    if (!app) throw new NotFoundException('SELLER_APPLICATION_NOT_FOUND');
    if (!['PENDING', 'UNDER_REVIEW'].includes(app.status)) throw new BadRequestException('SELLER_APPLICATION_NOT_REVIEWABLE');
    app.status = 'REJECTED'; app.rejectionReason = reason.trim(); app.reviewedAt = new Date(); app.reviewedBy = new Types.ObjectId(adminId);
    return app.save();
  }
}
