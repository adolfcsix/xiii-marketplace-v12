import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { JwtUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ListNotificationsDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@CurrentUser() user: JwtUser, @Query() dto: ListNotificationsDto) { return this.notifications.list(user.sub, dto); }
  @Get('unread-count') unread(@CurrentUser() user: JwtUser) { return this.notifications.unreadCount(user.sub); }
  @Patch('read-all') readAll(@CurrentUser() user: JwtUser) { return this.notifications.markAllRead(user.sub); }
  @Patch(':id/read') read(@CurrentUser() user: JwtUser, @Param('id') id: string) { return this.notifications.markRead(user.sub, id); }
}
