import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { BannerDto, SectionDto } from './cms.dto';
import { CmsService } from './cms.service';
import { AdminPermissions } from '../access-control/access.decorators';
import { AdminPermissionsGuard } from '../access-control/access.guards';

@Controller()
export class CmsController {
  constructor(private readonly cms: CmsService) {}
  @Get('cms/home') home() { return this.cms.publicHome(); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN') @AdminPermissions('CMS_MANAGE') @Get('admin/cms/banners') banners() { return this.cms.listBanners(); }
  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN') @AdminPermissions('CMS_MANAGE') @Post('admin/cms/banners') createBanner(@Body() d: BannerDto) { return this.cms.createBanner(d); }
  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN') @AdminPermissions('CMS_MANAGE') @Patch('admin/cms/banners/:id') updateBanner(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: BannerDto) { return this.cms.updateBanner(id,d); }
  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN') @AdminPermissions('CMS_MANAGE') @Delete('admin/cms/banners/:id') archiveBanner(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.cms.archiveBanner(id); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN') @AdminPermissions('CMS_MANAGE') @Get('admin/cms/sections') sections() { return this.cms.listSections(); }
  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN') @AdminPermissions('CMS_MANAGE') @Post('admin/cms/sections') createSection(@Body() d: SectionDto) { return this.cms.createSection(d); }
  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN') @AdminPermissions('CMS_MANAGE') @Patch('admin/cms/sections/:id') updateSection(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: SectionDto) { return this.cms.updateSection(id,d); }
}
