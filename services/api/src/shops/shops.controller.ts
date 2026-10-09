import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/auth.types';
import { UpdateShopDto } from './shops.dto';
import { ShopsService } from './shops.service';
import { ShopPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard } from '../access-control/access.guards';
@Controller()
export class ShopsController {
    constructor(private readonly shops: ShopsService) { }
    @Get('shops/:slug')
    get(
    @Param('slug')
    slug: string) { return this.shops.publicBySlug(slug); }
    @UseGuards(JwtGuard, ShopPermissionsGuard)
    @ShopPermissions('SHOP_VIEW')
    @Get('seller/shop')
    mine(
    @CurrentUser()
    u: JwtUser) { return this.shops.mine(u.sub); }
    @UseGuards(JwtGuard, ShopPermissionsGuard)
    @ShopPermissions('SHOP_SETTINGS')
    @Patch('seller/shop')
    update(
    @CurrentUser()
    u: JwtUser, 
    @Body()
    dto: UpdateShopDto) { return this.shops.updateMine(u.sub, dto); }
}

