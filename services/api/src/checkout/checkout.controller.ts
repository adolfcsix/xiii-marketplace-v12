import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/auth.types';
import { CheckoutService } from './checkout.service';
import { CheckoutPreviewDto, CreateCheckoutDto } from './checkout.dto';

@Controller('checkout')
@UseGuards(JwtGuard)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('preview')
  preview(@CurrentUser() user: JwtUser, @Body() dto: CheckoutPreviewDto) {
    return this.checkout.preview(user.sub, dto);
  }

  @Post('create')
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateCheckoutDto) {
    return this.checkout.create(user.sub, dto);
  }
}
