import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { JwtUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalyticsRangeDto } from './analytics.dto';
import { AnalyticsService } from './analytics.service';
import { ShopPermissions, AdminPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard, AdminPermissionsGuard } from '../access-control/access.guards';

@Controller()
@UseGuards(JwtGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @UseGuards(ShopPermissionsGuard)
  @ShopPermissions('ANALYTICS_VIEW')
  @Get('seller/analytics')
  seller(@CurrentUser() user: JwtUser, @Query() query: AnalyticsRangeDto) {
    return this.analytics.seller(user.sub, query);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(AdminPermissionsGuard)
  @AdminPermissions('ANALYTICS_VIEW')
  @Get('admin/analytics')
  admin(@Query() query: AnalyticsRangeDto) {
    return this.analytics.admin(query);
  }
}
