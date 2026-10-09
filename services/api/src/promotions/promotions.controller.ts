import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtGuard } from '../auth/jwt.guard';
import { JwtUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateCampaignDto, CreateSellerVoucherDto, SellerPromotionQueryDto, TogglePromotionDto, UpdateCampaignDto, UpdateSellerVoucherDto } from './promotions.dto';
import { PromotionsService } from './promotions.service';
import { ShopPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard } from '../access-control/access.guards';

@Controller()
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  @Get('promotions/shop/:shopId')
  publicShop(@Param('shopId', ParseObjectIdPipe) shopId: Types.ObjectId) { return this.service.publicShop(shopId); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard) @Roles('SELLER','ADMIN','SUPER_ADMIN') @ShopPermissions('PROMOTION_MANAGE')
  @Get('seller/promotions/vouchers')
  vouchers(@CurrentUser() u: JwtUser, @Query() q: SellerPromotionQueryDto) { return this.service.voucherList(u.sub, q); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard) @Roles('SELLER','ADMIN','SUPER_ADMIN') @ShopPermissions('PROMOTION_MANAGE')
  @Post('seller/promotions/vouchers')
  createVoucher(@CurrentUser() u: JwtUser, @Body() d: CreateSellerVoucherDto) { return this.service.createVoucher(u.sub, d); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard) @Roles('SELLER','ADMIN','SUPER_ADMIN') @ShopPermissions('PROMOTION_MANAGE')
  @Patch('seller/promotions/vouchers/:id')
  updateVoucher(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: UpdateSellerVoucherDto) { return this.service.updateVoucher(u.sub, id, d); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard) @Roles('SELLER','ADMIN','SUPER_ADMIN') @ShopPermissions('PROMOTION_MANAGE')
  @Patch('seller/promotions/vouchers/:id/toggle')
  toggleVoucher(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: TogglePromotionDto) { return this.service.toggleVoucher(u.sub, id, d.active); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard) @Roles('SELLER','ADMIN','SUPER_ADMIN') @ShopPermissions('PROMOTION_MANAGE')
  @Delete('seller/promotions/vouchers/:id')
  archiveVoucher(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.service.archiveVoucher(u.sub, id); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard) @Roles('SELLER','ADMIN','SUPER_ADMIN') @ShopPermissions('PROMOTION_MANAGE')
  @Get('seller/promotions/campaigns')
  campaigns(@CurrentUser() u: JwtUser, @Query() q: SellerPromotionQueryDto) { return this.service.campaignList(u.sub, q); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard) @Roles('SELLER','ADMIN','SUPER_ADMIN') @ShopPermissions('PROMOTION_MANAGE')
  @Post('seller/promotions/campaigns')
  createCampaign(@CurrentUser() u: JwtUser, @Body() d: CreateCampaignDto) { return this.service.createCampaign(u.sub, d); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard) @Roles('SELLER','ADMIN','SUPER_ADMIN') @ShopPermissions('PROMOTION_MANAGE')
  @Patch('seller/promotions/campaigns/:id')
  updateCampaign(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: UpdateCampaignDto) { return this.service.updateCampaign(u.sub, id, d); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard) @Roles('SELLER','ADMIN','SUPER_ADMIN') @ShopPermissions('PROMOTION_MANAGE')
  @Patch('seller/promotions/campaigns/:id/toggle')
  toggleCampaign(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: TogglePromotionDto) { return this.service.toggleCampaign(u.sub, id, d.active); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard) @Roles('SELLER','ADMIN','SUPER_ADMIN') @ShopPermissions('PROMOTION_MANAGE')
  @Delete('seller/promotions/campaigns/:id')
  archiveCampaign(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.service.archiveCampaign(u.sub, id); }
}
