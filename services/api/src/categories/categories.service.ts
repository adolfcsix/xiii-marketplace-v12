import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category } from './category.schema';
import { CategoryDto } from './categories.dto';
import { toSlug } from '../common/utils/slug';
@Injectable()
export class CategoriesService {
    constructor(
    @InjectModel(Category.name)
    private m: Model<Category>) { }
    list() { return this.m.find({ active: true }).sort({ level: 1, sortOrder: 1, name: 1 }); }
    listAdmin() { return this.m.find().sort({ level: 1, sortOrder: 1, name: 1 }); }
    async create(d: CategoryDto) { let level = 0; let parentId: any = null; if (d.parentId) {
        const p = await this.m.findById(d.parentId);
        if (!p)
            throw new NotFoundException('PARENT_CATEGORY_NOT_FOUND');
        level = p.level + 1;
        parentId = p._id;
    } return this.m.create({ ...d, parentId, level, slug: toSlug(d.name) }); }
    async update(id: Types.ObjectId, d: CategoryDto) { const c = await this.m.findById(id); if (!c)
        throw new NotFoundException('CATEGORY_NOT_FOUND'); Object.assign(c, d); if (d.name)
        c.slug = toSlug(d.name); if (d.parentId) {
        const p = await this.m.findById(d.parentId);
        if (!p)
            throw new NotFoundException('PARENT_CATEGORY_NOT_FOUND');
        c.parentId = p._id;
        c.level = p.level + 1;
    } return c.save(); }
}

