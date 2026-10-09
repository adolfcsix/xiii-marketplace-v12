import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsMongoId, IsUUID } from 'class-validator';
import { Types } from 'mongoose';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/auth.types';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { ShopPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard } from '../access-control/access.guards';
import { AiArtworkService } from './ai-artwork.service';
import { ArtworkForm } from './ai-artwork-image';

class CreateAiArtworkDto {
  @IsMongoId() variantId: string;
  @IsIn(['neutral', 'masculine', 'feminine']) form: ArtworkForm;
  @IsUUID('4') requestId: string;
}
class ReviewAiArtworkDto { @IsIn(['ACCEPT', 'REJECT']) decision: 'ACCEPT' | 'REJECT'; }
@Controller('seller/products/:productId/ai-artwork')
@UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
@Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
@ShopPermissions('PRODUCT_WRITE')
export class AiArtworkController {
  constructor(private readonly service: AiArtworkService) {}
  @Get('availability') availability(@CurrentUser() user: JwtUser, @Param('productId', ParseObjectIdPipe) productId: Types.ObjectId) { return this.service.availability(user.sub, productId); }
  @Post() create(@CurrentUser() user: JwtUser, @Param('productId', ParseObjectIdPipe) productId: Types.ObjectId, @Body() dto: CreateAiArtworkDto) { return this.service.create(user.sub, productId, dto.variantId, dto.form, dto.requestId); }
  @Get(':jobId') get(@CurrentUser() user: JwtUser, @Param('productId', ParseObjectIdPipe) productId: Types.ObjectId, @Param('jobId', ParseObjectIdPipe) jobId: Types.ObjectId) { return this.service.get(user.sub, productId, jobId); }
  @Post(':jobId/review') review(@CurrentUser() user: JwtUser, @Param('productId', ParseObjectIdPipe) productId: Types.ObjectId, @Param('jobId', ParseObjectIdPipe) jobId: Types.ObjectId, @Body() dto: ReviewAiArtworkDto) { return this.service.review(user.sub, productId, jobId, dto.decision); }
}
