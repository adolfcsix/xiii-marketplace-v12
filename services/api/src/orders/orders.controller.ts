import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/auth.types';
import { CancelOrderDto, ListOrdersDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: ListOrdersDto) {
    return this.orders.listForBuyer(user.sub, query);
  }

  @Get(':orderCode')
  get(@CurrentUser() user: JwtUser, @Param('orderCode') orderCode: string) {
    return this.orders.getForBuyer(user.sub, orderCode);
  }

  @Post(':orderCode/cancel')
  cancel(@CurrentUser() user: JwtUser, @Param('orderCode') orderCode: string, @Body() dto: CancelOrderDto) {
    return this.orders.cancelForBuyer(user.sub, orderCode, dto);
  }

  @Post(':orderCode/confirm-received')
  confirmReceived(@CurrentUser() user: JwtUser, @Param('orderCode') orderCode: string) {
    return this.orders.confirmReceived(user.sub, orderCode);
  }
}
