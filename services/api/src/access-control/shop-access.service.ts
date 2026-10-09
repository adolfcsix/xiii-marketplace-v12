import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop } from '../shops/shop.schema';
import { ShopMember } from './shop-member.schema';
import { SHOP_ROLE_DEFAULTS, ShopPermission } from './access.constants';

@Injectable()
export class ShopAccessService {
  constructor(@InjectModel(Shop.name) private shops: Model<Shop>, @InjectModel(ShopMember.name) private members: Model<ShopMember>) {}
  oid(id:string|Types.ObjectId){return id instanceof Types.ObjectId?id:new Types.ObjectId(id);}
  async resolve(userId:string, activeOnly=false) {
    const uid=this.oid(userId);
    const owned=await this.shops.findOne({ownerId:uid,...(activeOnly?{status:'ACTIVE'}:{})}).lean<any>();
    if(owned) return { shop: owned, shopId: owned._id as Types.ObjectId, ownerId: owned.ownerId as Types.ObjectId, role:'OWNER', permissions:[...SHOP_ROLE_DEFAULTS.OWNER] as string[] };
    const member=await this.members.findOne({userId:uid,status:'ACTIVE'}).lean<any>();
    if(!member) throw new NotFoundException(activeOnly?'ACTIVE_SHOP_NOT_FOUND':'SHOP_ACCESS_NOT_FOUND');
    const shop=await this.shops.findOne({_id:member.shopId,...(activeOnly?{status:'ACTIVE'}:{})}).lean<any>();
    if(!shop) throw new NotFoundException(activeOnly?'ACTIVE_SHOP_NOT_FOUND':'SHOP_NOT_FOUND');
    const permissions=member.permissions?.length?member.permissions:SHOP_ROLE_DEFAULTS[member.role]||[];
    return { shop, shopId: shop._id as Types.ObjectId, ownerId: shop.ownerId as Types.ObjectId, role:member.role, permissions };
  }
  async require(userId:string, permissions:ShopPermission[], activeOnly=false){
    const access=await this.resolve(userId,activeOnly);
    if(access.role!=='OWNER' && permissions.some(p=>!access.permissions.includes(p))) throw new ForbiddenException('SHOP_PERMISSION_DENIED');
    return access;
  }
}
