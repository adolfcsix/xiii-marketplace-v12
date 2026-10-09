import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminPermissions } from '../access-control/access.decorators';
import { AdminPermissionsGuard } from '../access-control/access.guards';
import { ListAdminOrdersDto } from './orders.dto';
import { OrdersService } from './orders.service';
@Controller('admin/orders')
@UseGuards(JwtGuard,RolesGuard,AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN')
export class AdminOrdersController{
  constructor(private orders:OrdersService){}
  @Get() @AdminPermissions('ORDERS_MANAGE') list(@Query()q:ListAdminOrdersDto){return this.orders.listForAdmin(q);}
  @Get(':orderCode') @AdminPermissions('ORDERS_MANAGE') get(@Param('orderCode')code:string){return this.orders.getForAdmin(code);}
}
