import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../auth/user.schema';
import { SellerApplication } from '../sellers/seller-application.schema';
import { ShopMember } from '../access-control/shop-member.schema';
import { Shop } from '../shops/shop.schema';
import { Address } from './address.schema';
import { AddressDto, AdminUserQueryDto, AdminUserVerificationDto, UpdateMeDto } from './users.dto';
import { RealtimePublisher } from '../notifications/realtime-publisher.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Address.name) private readonly addresses: Model<Address>,
    @InjectModel(SellerApplication.name) private readonly sellerApplications: Model<SellerApplication>,
    @InjectModel(ShopMember.name) private readonly shopMembers: Model<ShopMember>,
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    private readonly realtime: RealtimePublisher,
  ) {}

  private safeSelect = '-passwordHash -refreshTokenHash';
  private escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  async me(id: string) {
    const u = await this.users.findById(id).select(this.safeSelect);
    if (!u) throw new NotFoundException('USER_NOT_FOUND');
    return u;
  }

  async updateMe(id: string, dto: UpdateMeDto) {
    if (dto.phone && await this.users.exists({ phone: dto.phone, _id: { $ne: id } })) throw new ConflictException('PHONE_EXISTS');
    const u = await this.users.findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true }).select(this.safeSelect);
    if (!u) throw new NotFoundException('USER_NOT_FOUND');
    return u;
  }

  listAddresses(userId: string) { return this.addresses.find({ userId }).sort({ isDefault: -1, createdAt: -1 }); }
  async createAddress(userId: string, dto: AddressDto) {
    if (dto.isDefault) await this.addresses.updateMany({ userId }, { $set: { isDefault: false } });
    return this.addresses.create({ ...dto, userId: new Types.ObjectId(userId) });
  }
  async updateAddress(userId: string, id: Types.ObjectId, dto: AddressDto) {
    if (dto.isDefault) await this.addresses.updateMany({ userId }, { $set: { isDefault: false } });
    const a = await this.addresses.findOneAndUpdate({ _id: id, userId }, { $set: dto }, { new: true, runValidators: true });
    if (!a) throw new NotFoundException('ADDRESS_NOT_FOUND');
    return a;
  }
  async deleteAddress(userId: string, id: Types.ObjectId) {
    const r = await this.addresses.deleteOne({ _id: id, userId });
    if (!r.deletedCount) throw new NotFoundException('ADDRESS_NOT_FOUND');
    return { deleted: true };
  }

  async adminList(query: AdminUserQueryDto) {
    const page = Number(query.page || 1); const limit = Number(query.limit || 20);
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.role) filter.roles = query.role;
    if (query.search?.trim()) {
      const rx = new RegExp(this.escapeRegex(query.search.trim()), 'i');
      filter.$or = [{ email: rx }, { fullName: rx }, { phone: rx }];
    }
    const [items, total] = await Promise.all([
      this.users.find(filter).select(this.safeSelect).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<any[]>(),
      this.users.countDocuments(filter),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async adminDetail(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('USER_NOT_FOUND');
    const user = await this.users.findById(id).select(this.safeSelect).lean<any>();
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    const [addresses, sellerApplication, memberships] = await Promise.all([
      this.addresses.find({ userId: user._id }).sort({ isDefault: -1, createdAt: -1 }).lean<any[]>(),
      this.sellerApplications.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean<any>(),
      this.shopMembers.find({ userId: user._id }).lean<any[]>(),
    ]);
    const shopIds = memberships.map(x => x.shopId);
    const shops = shopIds.length ? await this.shops.find({ _id: { $in: shopIds } }).select({ name: 1, slug: 1, status: 1, verified: 1 }).lean<any[]>() : [];
    const shopMap = new Map(shops.map(s => [s._id.toString(), s]));
    return {
      user,
      addresses,
      sellerApplication,
      shopMemberships: memberships.map(m => ({ ...m, shop: shopMap.get(m.shopId.toString()) || null })),
    };
  }

  async adminSetStatus(actorId: string, targetId: string, status: string) {
    if (actorId === targetId && status !== 'ACTIVE') throw new ForbiddenException('CANNOT_BLOCK_SELF');
    const user = await this.users.findById(targetId);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.roles.includes('SUPER_ADMIN') && actorId !== targetId) throw new ForbiddenException('SUPER_ADMIN_STATUS_IMMUTABLE');
    user.status = status;
    if (status === 'BLOCKED') user.refreshTokenHash = undefined;
    await user.save();
    if (status !== 'ACTIVE') this.realtime.disconnectUser(targetId);
    return this.users.findById(targetId).select(this.safeSelect);
  }

  async adminSetVerification(actorId: string, targetId: string, dto: AdminUserVerificationDto) {
    const user = await this.users.findById(targetId);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.roles.includes('SUPER_ADMIN') && actorId !== targetId) throw new ForbiddenException('SUPER_ADMIN_VERIFICATION_IMMUTABLE');
    if (typeof dto.emailVerified === 'boolean') user.emailVerified = dto.emailVerified;
    if (typeof dto.phoneVerified === 'boolean') user.phoneVerified = dto.phoneVerified;
    await user.save();
    return this.users.findById(targetId).select(this.safeSelect);
  }
}
