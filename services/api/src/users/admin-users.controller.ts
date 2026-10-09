import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { JwtUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminPermissions } from '../access-control/access.decorators';
import { AdminPermissionsGuard } from '../access-control/access.guards';
import { AdminUserQueryDto, AdminUserStatusDto, AdminUserVerificationDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@AdminPermissions('USERS_MANAGE')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: AdminUserQueryDto) { return this.users.adminList(query); }

  @Get(':id')
  detail(@Param('id') id: string) { return this.users.adminDetail(id); }

  @Patch(':id/status')
  status(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: AdminUserStatusDto) {
    return this.users.adminSetStatus(actor.sub, id, dto.status);
  }

  @Patch(':id/verification')
  verification(@CurrentUser() actor: JwtUser, @Param('id') id: string, @Body() dto: AdminUserVerificationDto) {
    return this.users.adminSetVerification(actor.sub, id, dto);
  }
}
