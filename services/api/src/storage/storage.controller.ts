import { Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/auth.types';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { CreateUploadUrlDto } from './storage.dto';
import { StorageService } from './storage.service';

@Controller('uploads')
@UseGuards(JwtGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('presign')
  @RateLimit(30, 60)
  presign(@CurrentUser() user: JwtUser, @Body() dto: CreateUploadUrlDto) {
    const roles = new Set(user.roles || []);
    const adminOnly = new Set(['CMS_BANNER','CATEGORY_IMAGE','BRAND_LOGO']);
    const sellerOnly = new Set(['PRODUCT_IMAGE','SHOP_LOGO','SHOP_BANNER']);
    if (adminOnly.has(dto.purpose) && !roles.has('ADMIN') && !roles.has('SUPER_ADMIN')) {
      throw new ForbiddenException({ code: 'UPLOAD_PURPOSE_FORBIDDEN', message: 'This upload purpose requires an admin account.' });
    }
    if (sellerOnly.has(dto.purpose) && !roles.has('SELLER') && !roles.has('ADMIN') && !roles.has('SUPER_ADMIN')) {
      throw new ForbiddenException({ code: 'UPLOAD_PURPOSE_FORBIDDEN', message: 'This upload purpose requires a seller account.' });
    }
    return this.storage.createUpload(user.sub, dto);
  }
}
