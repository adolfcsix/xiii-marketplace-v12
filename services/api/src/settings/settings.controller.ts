import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { JwtUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminPermissions } from '../access-control/access.decorators';
import { AdminPermissionsGuard } from '../access-control/access.guards';
import { UpdateMarketplaceSettingsDto } from './settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class PublicSettingsController { constructor(private service:SettingsService){} @Get('public') get(){return this.service.publicConfig();} }

@Controller('admin/settings')
@UseGuards(JwtGuard,RolesGuard,AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN')
export class AdminSettingsController {
  constructor(private service:SettingsService){}
  @Get() @AdminPermissions('SETTINGS_MANAGE') get(){return this.service.get();}
  @Patch() @AdminPermissions('SETTINGS_MANAGE') update(@CurrentUser()u:JwtUser,@Body()d:UpdateMarketplaceSettingsDto){return this.service.update(u.sub,d);}
}
