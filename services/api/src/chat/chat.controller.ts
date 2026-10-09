import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { JwtUser } from '../common/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListConversationsDto, ListMessagesDto, SendMessageDto, StartConversationDto } from './chat.dto';
import { ChatService } from './chat.service';
import { ShopPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard } from '../access-control/access.guards';

@UseGuards(JwtGuard)
@Controller('chat')
export class BuyerChatController {
  constructor(private readonly chat: ChatService) {}
  @Post('conversations') start(@CurrentUser() user: JwtUser, @Body() dto: StartConversationDto) { return this.chat.startBuyerConversation(user.sub, dto); }
  @Get('unread-count') unread(@CurrentUser() user: JwtUser) { return this.chat.unreadCountBuyer(user.sub); }
  @Get('conversations') list(@CurrentUser() user: JwtUser, @Query() dto: ListConversationsDto) { return this.chat.listBuyer(user.sub, dto); }
  @Get('conversations/:id/messages') messages(@CurrentUser() user: JwtUser, @Param('id') id: string, @Query() dto: ListMessagesDto) { return this.chat.messagesBuyer(user.sub, id, dto); }
  @Post('conversations/:id/messages') send(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: SendMessageDto) { return this.chat.sendBuyer(user.sub, id, dto); }
  @Patch('conversations/:id/read') read(@CurrentUser() user: JwtUser, @Param('id') id: string) { return this.chat.markReadBuyer(user.sub, id); }
}

@UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
@Roles('SELLER','ADMIN','SUPER_ADMIN')
@ShopPermissions('CHAT_REPLY')
@Controller('seller/chat')
export class SellerChatController {
  constructor(private readonly chat: ChatService) {}
  @Get('unread-count') unread(@CurrentUser() user: JwtUser) { return this.chat.unreadCountSeller(user.sub); }
  @Get('conversations') list(@CurrentUser() user: JwtUser, @Query() dto: ListConversationsDto) { return this.chat.listSeller(user.sub, dto); }
  @Get('conversations/:id/messages') messages(@CurrentUser() user: JwtUser, @Param('id') id: string, @Query() dto: ListMessagesDto) { return this.chat.messagesSeller(user.sub, id, dto); }
  @Post('conversations/:id/messages') send(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: SendMessageDto) { return this.chat.sendSeller(user.sub, id, dto); }
  @Patch('conversations/:id/read') read(@CurrentUser() user: JwtUser, @Param('id') id: string) { return this.chat.markReadSeller(user.sub, id); }
}
