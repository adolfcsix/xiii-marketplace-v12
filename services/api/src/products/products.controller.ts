import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Types } from 'mongoose';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtUser } from '../common/auth.types';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { AdminApproveProductDto, AdminRejectProductDto, CreateCatalogProductDto, CreateProductDto, UpdateProductDto } from './products.dto';
import { ProductsService } from './products.service';
import { ShopPermissions, AdminPermissions } from '../access-control/access.decorators';
import { ShopPermissionsGuard, AdminPermissionsGuard } from '../access-control/access.guards';

class ProductQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() shop?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) priceMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) priceMax?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) rating?: number;
  @IsOptional() @IsIn(['popular', 'newest', 'rating', 'price_asc', 'price_desc']) sort: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc' = 'popular';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 24;
}

class SellerProductQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['ALL', 'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'HIDDEN']) status = 'ALL';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

class AdminProductQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['ALL', 'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'HIDDEN']) status = 'PENDING_REVIEW';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

@Controller()
export class ProductsController {
  constructor(private s: ProductsService) {}

  @Get('products')
  list(@Query() q: ProductQuery) { return this.s.list(q); }

  @Get('products/:slug')
  one(@Param('slug') slug: string) { return this.s.one(slug); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Get('seller/products')
  @ShopPermissions('PRODUCT_READ')
  sellerList(@CurrentUser() u: JwtUser, @Query() q: SellerProductQuery) { return this.s.sellerList(u.sub, q); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Get('seller/products/summary')
  @ShopPermissions('PRODUCT_READ')
  sellerSummary(@CurrentUser() u: JwtUser) { return this.s.sellerSummary(u.sub); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Get('seller/products/:id')
  @ShopPermissions('PRODUCT_READ')
  sellerOne(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.s.sellerOne(u.sub, id); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Post('seller/products')
  @ShopPermissions('PRODUCT_WRITE')
  create(@CurrentUser() u: JwtUser, @Body() d: CreateProductDto) { return this.s.create(u.sub, d); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Post('seller/products/catalog')
  @ShopPermissions('PRODUCT_WRITE')
  createCatalog(@CurrentUser() u: JwtUser, @Body() d: CreateCatalogProductDto) { return this.s.createCatalog(u.sub, d); }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Patch('seller/products/:id')
  @ShopPermissions('PRODUCT_WRITE')
  update(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: UpdateProductDto) {
    return this.s.update(u.sub, id, d);
  }

  @UseGuards(JwtGuard, RolesGuard, ShopPermissionsGuard)
  @Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
  @Delete('seller/products/:id')
  @ShopPermissions('PRODUCT_WRITE')
  remove(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.s.remove(u.sub, id); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @AdminPermissions('PRODUCTS_MODERATE')
  @Get('admin/products')
  adminList(@Query() q: AdminProductQuery) { return this.s.adminList(q); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @AdminPermissions('PRODUCTS_MODERATE')
  @Get('admin/products/summary')
  adminSummary() { return this.s.adminSummary(); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @AdminPermissions('PRODUCTS_MODERATE')
  @Get('admin/products/:id')
  adminOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.s.adminOne(id); }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @AdminPermissions('PRODUCTS_MODERATE')
  @Post('admin/products/:id/approve')
  adminApprove(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: AdminApproveProductDto) {
    return this.s.adminApprove(u.sub, id, d.note);
  }

  @UseGuards(JwtGuard, RolesGuard, AdminPermissionsGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @AdminPermissions('PRODUCTS_MODERATE')
  @Post('admin/products/:id/reject')
  adminReject(@CurrentUser() u: JwtUser, @Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() d: AdminRejectProductDto) {
    return this.s.adminReject(u.sub, id, d.reason);
  }
}
