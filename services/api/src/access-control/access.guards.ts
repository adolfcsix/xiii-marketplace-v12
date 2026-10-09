import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ADMIN_PERMISSIONS_KEY, AdminPermission, SHOP_PERMISSIONS_KEY, ShopPermission } from './access.constants';
import { ShopAccessService } from './shop-access.service';
import { AdminAccess } from './admin-access.schema';

@Injectable()
export class ShopPermissionsGuard implements CanActivate {
  constructor(private reflector:Reflector, private access:ShopAccessService){}
  async canActivate(ctx:ExecutionContext){
    const required=this.reflector.getAllAndOverride<ShopPermission[]>(SHOP_PERMISSIONS_KEY,[ctx.getHandler(),ctx.getClass()])||[];
    if(!required.length)return true;
    const req=ctx.switchToHttp().getRequest(); const user=req.user;
    if(!user?.sub)throw new ForbiddenException('AUTH_REQUIRED');
    const resolved=await this.access.require(user.sub,required,true); req.shopAccess=resolved; return true;
  }
}

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(private reflector:Reflector,@InjectModel(AdminAccess.name) private adminAccess:Model<AdminAccess>){}
  async canActivate(ctx:ExecutionContext){
    const required=this.reflector.getAllAndOverride<AdminPermission[]>(ADMIN_PERMISSIONS_KEY,[ctx.getHandler(),ctx.getClass()])||[];
    if(!required.length)return true;
    const user=ctx.switchToHttp().getRequest().user;
    if(!user?.sub)throw new ForbiddenException('AUTH_REQUIRED');
    if(user.roles?.includes('SUPER_ADMIN'))return true;
    if(!user.roles?.includes('ADMIN'))throw new ForbiddenException('ADMIN_ROLE_REQUIRED');
    const profile=await this.adminAccess.findOne({userId:new Types.ObjectId(user.sub),status:'ACTIVE'}).lean<any>();
    if(!profile || required.some(p=>!profile.permissions?.includes(p)))throw new ForbiddenException('ADMIN_PERMISSION_DENIED');
    return true;
  }
}
