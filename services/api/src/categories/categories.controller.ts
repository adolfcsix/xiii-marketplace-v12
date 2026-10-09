import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CategoryDto } from './categories.dto';
import { CategoriesService } from './categories.service';
import { AdminPermissions } from '../access-control/access.decorators';
import { AdminPermissionsGuard } from '../access-control/access.guards';
@Controller()
export class CategoriesController {
    constructor(private s: CategoriesService) { }
    @Get('categories')
    list() { return this.s.list(); }
    @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @AdminPermissions('CMS_MANAGE')
    @Get('admin/categories')
    listAdmin() { return this.s.listAdmin(); }
    @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @AdminPermissions('CMS_MANAGE')
    @Post('admin/categories')
    create(
    @Body()
    d: CategoryDto) { return this.s.create(d); }
    @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @AdminPermissions('CMS_MANAGE')
    @Patch('admin/categories/:id')
    update(
    @Param('id', ParseObjectIdPipe)
    id: Types.ObjectId, 
    @Body()
    d: CategoryDto) { return this.s.update(id, d); }
}

