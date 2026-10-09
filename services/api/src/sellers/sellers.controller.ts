import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/auth.types';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ApplySellerDto, ReviewSellerDto, SellerApplicationQueryDto } from './sellers.dto';
import { SellersService } from './sellers.service';
import { AdminPermissions } from '../access-control/access.decorators';
import { AdminPermissionsGuard } from '../access-control/access.guards';

@Controller()
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @UseGuards(JwtGuard)
  @Post('seller/application')
  apply(@CurrentUser() u: JwtUser, @Body() dto: ApplySellerDto) { return this.sellers.apply(u.sub, dto); }

  @UseGuards(JwtGuard)
  @Get('seller/application/me')
  mine(@CurrentUser() u: JwtUser) { return this.sellers.mine(u.sub); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN') @AdminPermissions('SELLERS_MANAGE')
  @Get('admin/seller-applications')
  list(@Query() query: SellerApplicationQueryDto) { return this.sellers.list(query); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN') @AdminPermissions('SELLERS_MANAGE')
  @Get('admin/seller-applications/:id')
  detail(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.sellers.detail(id); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN') @AdminPermissions('SELLERS_MANAGE')
  @Post('admin/seller-applications/:id/review')
  review(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.sellers.markUnderReview(id, u.sub); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN') @AdminPermissions('SELLERS_MANAGE')
  @Post('admin/seller-applications/:id/approve')
  approve(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.sellers.approve(id, u.sub); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN') @AdminPermissions('SELLERS_MANAGE')
  @Post('admin/seller-applications/:id/reject')
  reject(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() dto: ReviewSellerDto) { return this.sellers.reject(id, u.sub, dto.reason); }
}
