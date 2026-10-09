import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { JwtUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AccessService } from './access.service';
import { AdminPermissions, ShopPermissions } from './access.decorators';
import { AdminPermissionsGuard, ShopPermissionsGuard } from './access.guards';
import { AddShopMemberDto, AuditQueryDto, CreateAdminAccessDto, UpdateAdminAccessDto, UpdateShopMemberDto } from './access.dto';
import { AuditService } from './audit.service';

@Controller('seller/access') @UseGuards(JwtGuard,RolesGuard,ShopPermissionsGuard) @Roles('SELLER')
export class SellerAccessController{
  constructor(private access:AccessService){}
  @Get('me') @ShopPermissions('SHOP_VIEW') me(@CurrentUser()u:JwtUser){return this.access.myAccess(u.sub);}
  @Get('team') @ShopPermissions('TEAM_MANAGE') team(@CurrentUser()u:JwtUser){return this.access.listTeam(u.sub);}
  @Post('team') @ShopPermissions('TEAM_MANAGE') add(@CurrentUser()u:JwtUser,@Body()d:AddShopMemberDto){return this.access.addTeam(u.sub,d);}
  @Patch('team/:id') @ShopPermissions('TEAM_MANAGE') update(@CurrentUser()u:JwtUser,@Param('id')id:string,@Body()d:UpdateShopMemberDto){return this.access.updateTeam(u.sub,id,d);}
  @Delete('team/:id') @ShopPermissions('TEAM_MANAGE') remove(@CurrentUser()u:JwtUser,@Param('id')id:string){return this.access.removeTeam(u.sub,id);}
}
@Controller('admin/access') @UseGuards(JwtGuard,RolesGuard,AdminPermissionsGuard) @Roles('ADMIN','SUPER_ADMIN')
export class AdminAccessController{
  constructor(private access:AccessService,private audit:AuditService){}
  @Get('admins') @AdminPermissions('ADMIN_MANAGE') admins(){return this.access.listAdmins();}
  @Post('admins') @AdminPermissions('ADMIN_MANAGE') create(@CurrentUser()u:JwtUser,@Body()d:CreateAdminAccessDto){return this.access.createAdmin(u.sub,d);}
  @Patch('admins/:userId') @AdminPermissions('ADMIN_MANAGE') update(@CurrentUser()u:JwtUser,@Param('userId')id:string,@Body()d:UpdateAdminAccessDto){return this.access.updateAdmin(u.sub,id,d);}
  @Get('audit-logs') @AdminPermissions('AUDIT_VIEW') logs(@Query()q:AuditQueryDto){return this.audit.list(q);}
}
