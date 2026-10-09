import { Body, Controller, Get, Headers, HttpCode, Ip, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RawResponse } from '../common/decorators/raw-response.decorator';
import { JwtUser } from '../common/auth.types';
import { CreatePaymentDto } from './payment.dto';
import { PaymentsService } from './payments.service';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('providers')
  providers() { return this.payments.getProviders(); }

  @Post('create')
  @RateLimit(20, 60)
  @UseGuards(JwtGuard)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreatePaymentDto, @Ip() ip: string, @Headers('x-forwarded-for') forwarded?: string) {
    const rawIp = forwarded?.split(',')[0]?.trim() || ip || '127.0.0.1';
    const realIp = rawIp.includes(':') && !rawIp.startsWith('::ffff:') ? '127.0.0.1' : rawIp.replace('::ffff:', '');
    return this.payments.create(user.sub, dto, realIp);
  }

  @Get('order/:orderCode')
  @UseGuards(JwtGuard)
  getForOrder(@CurrentUser() user: JwtUser, @Param('orderCode') orderCode: string) {
    return this.payments.getForBuyer(user.sub, orderCode);
  }

  @Post('webhooks/momo')
  @RateLimit(300, 60)
  @RawResponse()
  @HttpCode(204)
  async momoIpn(@Body() payload: Record<string, any>) {
    await this.payments.handleMomoIpn(payload);
  }

  @Get('webhooks/vnpay')
  @RateLimit(300, 60)
  @RawResponse()
  vnpayIpn(@Query() query: Record<string, any>) {
    return this.payments.handleVnpayIpn(query);
  }
}
