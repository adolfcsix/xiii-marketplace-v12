import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/auth.types';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { VariantDto, UpdateVariantDto } from './variants.dto';
import { VariantsService } from './variants.service';
import { ShopPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard } from '../access-control/access.guards';

@Controller()
export class VariantsController {
  constructor(private s: VariantsService) {}

  @Get('products/:productId/variants')
  list(@Param('productId', ParseObjectIdPipe) id: Types.ObjectId) { return this.s.list(id); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Get('seller/products/:productId/variants')
  @ShopPermissions('PRODUCT_READ')
  sellerList(@CurrentUser() u: JwtUser, @Param('productId', ParseObjectIdPipe) id: Types.ObjectId) { return this.s.sellerList(u.sub, id); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Post('seller/products/:productId/variants')
  @ShopPermissions('PRODUCT_WRITE')
  create(@CurrentUser() u: JwtUser, @Param('productId', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: VariantDto) { return this.s.create(u.sub, id, d); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Patch('seller/variants/:id')
  @ShopPermissions('PRODUCT_WRITE')
  update(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: UpdateVariantDto) { return this.s.update(u.sub, id, d); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Delete('seller/variants/:id')
  @ShopPermissions('PRODUCT_WRITE')
  remove(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.s.remove(u.sub, id); }
}
