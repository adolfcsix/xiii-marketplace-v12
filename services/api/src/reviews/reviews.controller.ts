import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtUser } from '../common/auth.types';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateReviewDto, ListAdminReviewsDto, ListBuyerReviewsDto, ListPublicReviewsDto, ListSellerReviewsDto, ModerateReviewDto, SellerReplyDto } from './reviews.dto';
import { ReviewsService } from './reviews.service';
import { ShopPermissions, AdminPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard, AdminPermissionsGuard } from '../access-control/access.guards';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}
  @Get('product/:productId') publicList(@Param('productId') productId:string,@Query() query:ListPublicReviewsDto){return this.service.publicList(productId,query);}
  @Get('mine') @UseGuards(JwtGuard) mine(@CurrentUser() user:JwtUser,@Query() query:ListBuyerReviewsDto){return this.service.buyerList(user.sub,query);}
  @Post() @UseGuards(JwtGuard) create(@CurrentUser() user:JwtUser,@Body() dto:CreateReviewDto){return this.service.create(user.sub,dto);}
}

@Controller('seller/reviews')
@UseGuards(JwtGuard,RolesGuard,ShopPermissionsGuard)
@Roles('SELLER','ADMIN','SUPER_ADMIN')
@ShopPermissions('REVIEW_REPLY')
export class SellerReviewsController {
  constructor(private readonly service: ReviewsService) {}
  @Get() list(@CurrentUser() user:JwtUser,@Query() query:ListSellerReviewsDto){return this.service.sellerList(user.sub,query);}
  @Post(':id/reply') reply(@CurrentUser() user:JwtUser,@Param('id') id:string,@Body() dto:SellerReplyDto){return this.service.sellerReply(user.sub,id,dto);}
}

@Controller('admin/reviews')
@UseGuards(JwtGuard,RolesGuard,AdminPermissionsGuard)
@Roles('ADMIN','SUPER_ADMIN')
@AdminPermissions('REVIEWS_MODERATE')
export class AdminReviewsController {
  constructor(private readonly service: ReviewsService) {}
  @Get() list(@Query() query:ListAdminReviewsDto){return this.service.adminList(query);}
  @Patch(':id/moderate') moderate(@CurrentUser() user:JwtUser,@Param('id') id:string,@Body() dto:ModerateReviewDto){return this.service.moderate(user.sub,id,dto);}
}
