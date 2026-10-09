import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HomeBanner } from './home-banner.schema';
import { HomeSection } from './home-section.schema';
import { BannerDto, SectionDto } from './cms.dto';

@Injectable()
export class CmsService {
  constructor(
    @InjectModel(HomeBanner.name) private banners: Model<HomeBanner>,
    @InjectModel(HomeSection.name) private sections: Model<HomeSection>,
  ) {}

  async publicHome() {
    const now = new Date();
    const [banners, sections] = await Promise.all([
      this.banners.find({
        active: true,
        $and: [
          { $or: [{ startAt: null }, { startAt: { $exists: false } }, { startAt: { $lte: now } }] },
          { $or: [{ endAt: null }, { endAt: { $exists: false } }, { endAt: { $gte: now } }] },
        ],
      }).sort({ placement: 1, sortOrder: 1, createdAt: 1 }).lean(),
      this.sections.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    ]);
    return {
      generatedAt: now.toISOString(),
      banners: {
        hero: banners.filter(b => b.placement === 'HERO'),
        promo: banners.filter(b => b.placement === 'PROMO'),
        editorial: banners.filter(b => b.placement === 'EDITORIAL'),
      },
      sections,
    };
  }

  listBanners() { return this.banners.find().sort({ placement: 1, sortOrder: 1, createdAt: -1 }); }
  listSections() { return this.sections.find().sort({ sortOrder: 1, createdAt: 1 }); }

  createBanner(dto: BannerDto) {
    this.assertWindow(dto.startAt, dto.endAt);
    return this.banners.create(this.bannerPayload(dto));
  }
  async updateBanner(id: Types.ObjectId, dto: BannerDto) {
    const current = await this.banners.findById(id); if (!current) throw new NotFoundException('CMS_BANNER_NOT_FOUND');
    this.assertWindow(dto.startAt, dto.endAt);
    Object.assign(current, this.bannerPayload(dto));
    return current.save();
  }
  async archiveBanner(id: Types.ObjectId) {
    const current = await this.banners.findById(id); if (!current) throw new NotFoundException('CMS_BANNER_NOT_FOUND');
    current.active = false; current.adminNote = [current.adminNote, 'Archived from admin'].filter(Boolean).join(' · ');
    return current.save();
  }

  createSection(dto: SectionDto) { return this.sections.create({ ...dto, sortOrder: dto.sortOrder ?? 0, active: dto.active ?? true, config: dto.config ?? {} }); }
  async updateSection(id: Types.ObjectId, dto: SectionDto) {
    const current = await this.sections.findById(id); if (!current) throw new NotFoundException('CMS_SECTION_NOT_FOUND');
    Object.assign(current, { ...dto, config: dto.config ?? current.config }); return current.save();
  }

  private bannerPayload(dto: BannerDto) {
    return {
      ...dto,
      sortOrder: dto.sortOrder ?? 0,
      active: dto.active ?? true,
      startAt: dto.startAt ? new Date(dto.startAt) : null,
      endAt: dto.endAt ? new Date(dto.endAt) : null,
    };
  }
  private assertWindow(startAt?: string, endAt?: string) {
    if (startAt && Number.isNaN(new Date(startAt).getTime())) throw new BadRequestException('CMS_INVALID_START_AT');
    if (endAt && Number.isNaN(new Date(endAt).getTime())) throw new BadRequestException('CMS_INVALID_END_AT');
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) throw new BadRequestException('CMS_INVALID_SCHEDULE_WINDOW');
  }
}
