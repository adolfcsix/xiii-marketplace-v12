import { ConflictException, Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop } from './shop.schema';
import { Category } from '../categories/category.schema';
import { UpdateShopDto } from './shops.dto';
import { toSlug } from '../common/utils/slug';
import { ShopAccessService } from '../access-control/shop-access.service';

@Injectable()
export class ShopsService {
  constructor(
    @InjectModel(Shop.name) private readonly shops: Model<Shop>,
    @InjectModel(Category.name) private readonly categories: Model<Category>,
    private readonly access: ShopAccessService,
  ) {}

  async publicBySlug(slug: string) {
    const s = await this.shops.findOne({ slug, status: 'ACTIVE' });
    if (!s) throw new NotFoundException('SHOP_NOT_FOUND');
    return s;
  }

  async mine(userId: string) {
    const a = await this.access.resolve(userId);
    const s = await this.shops.findById(a.shopId).lean<any>();
    if (!s) throw new NotFoundException('SHOP_NOT_FOUND');
    const categoryIds = (s.businessCategories || []).map((x: any) => x.toString());
    const businessCategoryDetails = categoryIds.length ? await this.categories.find({ _id: { $in: categoryIds } }).select({ name: 1, slug: 1, level: 1, active: 1 }).lean<any[]>() : [];
    return { ...s, accessRole: a.role, permissions: a.permissions, businessCategoryDetails };
  }

  async updateMine(userId: string, dto: UpdateShopDto) {
    const a = await this.access.require(userId, ['SHOP_SETTINGS']);
    const s = await this.shops.findById(a.shopId);
    if (!s) throw new NotFoundException('SHOP_NOT_FOUND');

    if (dto.businessCategories) {
      const ids = dto.businessCategories.map(id => {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException('INVALID_CATEGORY_ID');
        return new Types.ObjectId(id);
      });
      const count = ids.length ? await this.categories.countDocuments({ _id: { $in: ids }, active: true }) : 0;
      if (count !== ids.length) throw new BadRequestException('CATEGORY_NOT_FOUND_OR_INACTIVE');
      s.businessCategories = ids;
    }

    if (dto.name && dto.name.trim() !== s.name) {
      const name = dto.name.trim();
      const base = toSlug(name); let slug = base; let suffix = 1;
      while (await this.shops.exists({ slug, _id: { $ne: s._id } })) slug = `${base}-${suffix++}`;
      if (!base) throw new BadRequestException('SHOP_NAME_INVALID');
      s.name = name; s.slug = slug;
    }

    const directFields: Array<keyof UpdateShopDto> = ['logo','banner','description','address','contactEmail','contactPhone','orderPreparationDays','returnPolicy'];
    for (const key of directFields) if (dto[key] !== undefined) (s as any)[key] = dto[key];
    try { return await s.save(); }
    catch (error: any) { if (error?.code === 11000) throw new ConflictException('SHOP_SLUG_EXISTS'); throw error; }
  }

  async assertOwner(userId: string, shopId: Types.ObjectId) {
    const s = await this.shops.findById(shopId);
    if (!s) throw new NotFoundException('SHOP_NOT_FOUND');
    const a = await this.access.resolve(userId);
    if (a.shopId.toString() !== shopId.toString()) throw new ForbiddenException('SHOP_OWNERSHIP_REQUIRED');
    return s;
  }
}
