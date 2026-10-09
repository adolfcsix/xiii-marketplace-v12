import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/auth.types';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';
import { CartService } from './cart.service';

@UseGuards(JwtGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CurrentUser() user: JwtUser) { return this.cart.get(user.sub); }

  @Post('items')
  add(@CurrentUser() user: JwtUser, @Body() dto: AddCartItemDto) {
    return this.cart.add(user.sub, new Types.ObjectId(dto.variantId), dto.quantity);
  }

  @Patch('items/:variantId')
  update(
    @CurrentUser() user: JwtUser,
    @Param('variantId', ParseObjectIdPipe) variantId: Types.ObjectId,
    @Body() dto: UpdateCartItemDto,
  ) { return this.cart.update(user.sub, variantId, dto.quantity); }

  @Delete('items/:variantId')
  remove(@CurrentUser() user: JwtUser, @Param('variantId', ParseObjectIdPipe) variantId: Types.ObjectId) {
    return this.cart.remove(user.sub, variantId);
  }

  @Delete()
  clear(@CurrentUser() user: JwtUser) { return this.cart.clear(user.sub); }
}
