import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/auth.types';
import { ListSellerOrdersDto, SellerUpdateOrderStatusDto } from './orders.dto';
import { OrdersService } from './orders.service';
import { ShopPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard } from '../access-control/access.guards';

@Controller('seller/orders')
@UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
@Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
export class SellerOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('summary')
  @ShopPermissions('ORDER_READ')
  summary(@CurrentUser() user: JwtUser) {
    return this.orders.sellerSummary(user.sub);
  }

  @Get()
  @ShopPermissions('ORDER_READ')
  list(@CurrentUser() user: JwtUser, @Query() query: ListSellerOrdersDto) {
    return this.orders.listForSeller(user.sub, query);
  }

  @Get(':subOrderCode')
  @ShopPermissions('ORDER_READ')
  get(@CurrentUser() user: JwtUser, @Param('subOrderCode') subOrderCode: string) {
    return this.orders.getForSeller(user.sub, subOrderCode);
  }

  @Patch(':subOrderCode/status')
  @ShopPermissions('ORDER_FULFILL')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('subOrderCode') subOrderCode: string,
    @Body() dto: SellerUpdateOrderStatusDto,
  ) {
    return this.orders.updateSellerStatus(user.sub, subOrderCode, dto);
  }
}
