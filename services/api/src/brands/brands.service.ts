import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Brand } from './brand.schema';
import { BrandDto } from './brands.dto';
import { toSlug } from '../common/utils/slug';
@Injectable()
export class BrandsService {
    constructor(
    @InjectModel(Brand.name)
    private m: Model<Brand>) { }
    list() { return this.m.find({ active: true }).sort({ name: 1 }); }
    listAdmin() { return this.m.find().sort({ name: 1 }); }
    create(d: BrandDto) { return this.m.create({ ...d, slug: toSlug(d.name) }); }
    async update(id: Types.ObjectId, d: BrandDto) { const b = await this.m.findById(id); if (!b)
        throw new NotFoundException('BRAND_NOT_FOUND'); Object.assign(b, d); if (d.name)
        b.slug = toSlug(d.name); return b.save(); }
}

