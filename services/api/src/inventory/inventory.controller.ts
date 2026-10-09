import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Types } from 'mongoose';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/auth.types';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { AdjustInventoryDto } from './inventory.dto';
import { InventoryService } from './inventory.service';
import { ShopPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard } from '../access-control/access.guards';

class InventoryQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['ALL', 'LOW', 'OUT', 'HEALTHY']) stock: 'ALL' | 'LOW' | 'OUT' | 'HEALTHY' = 'ALL';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30;
}

@Controller('seller/inventory')
@UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
@Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
export class InventoryController {
  constructor(private s: InventoryService) {}

  @Get('summary') @ShopPermissions('INVENTORY_READ')
  summary(@CurrentUser() u: JwtUser) { return this.s.summary(u.sub); }

  @Get() @ShopPermissions('INVENTORY_READ')
  list(@CurrentUser() u: JwtUser, @Query() q: InventoryQueryDto) { return this.s.list(u.sub, q); }

  @Patch(':variantId') @ShopPermissions('INVENTORY_WRITE')
  adjust(@CurrentUser() u: JwtUser, @Param('variantId', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: AdjustInventoryDto) {
    return this.s.adjust(u.sub, id, d);
  }

  @Get(':variantId/history') @ShopPermissions('INVENTORY_READ')
  history(@CurrentUser() u: JwtUser, @Param('variantId', ParseObjectIdPipe) id: Types.ObjectId) { return this.s.history(u.sub, id); }
}
