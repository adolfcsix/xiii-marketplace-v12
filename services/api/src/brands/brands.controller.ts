import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { BrandDto } from './brands.dto';
import { BrandsService } from './brands.service';
import { AdminPermissions } from '../access-control/access.decorators';
import { AdminPermissionsGuard } from '../access-control/access.guards';
@Controller()
export class BrandsController {
    constructor(private s: BrandsService) { }
    @Get('brands')
    list() { return this.s.list(); }
    @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @AdminPermissions('CMS_MANAGE')
    @Get('admin/brands')
    listAdmin() { return this.s.listAdmin(); }
    @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @AdminPermissions('CMS_MANAGE')
    @Post('admin/brands')
    create(
    @Body()
    d: BrandDto) { return this.s.create(d); }
    @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @AdminPermissions('CMS_MANAGE')
    @Patch('admin/brands/:id')
    update(
    @Param('id', ParseObjectIdPipe)
    id: Types.ObjectId, 
    @Body()
    d: BrandDto) { return this.s.update(id, d); }
}

