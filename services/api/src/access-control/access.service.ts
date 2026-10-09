import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../auth/user.schema';
import { ShopMember } from './shop-member.schema';
import { AdminAccess } from './admin-access.schema';
import { ADMIN_PERMISSIONS, SHOP_PERMISSIONS, SHOP_ROLE_DEFAULTS } from './access.constants';
import { ShopAccessService } from './shop-access.service';
@Injectable()
export class AccessService {
  constructor(@InjectModel(User.name) private users:Model<User>,@InjectModel(ShopMember.name) private members:Model<ShopMember>,@InjectModel(AdminAccess.name) private admins:Model<AdminAccess>,private shopAccess:ShopAccessService){}
  private oid(id:string){return new Types.ObjectId(id);}
  async myAccess(userId:string){const a=await this.shopAccess.resolve(userId);return{shop:{_id:a.shopId.toString(),name:a.shop.name,slug:a.shop.slug},role:a.role,permissions:a.permissions,availablePermissions:SHOP_PERMISSIONS};}
  async listTeam(userId:string){
    const a=await this.shopAccess.require(userId,['TEAM_MANAGE']);
    const rows=await this.members.find({shopId:a.shopId}).sort({role:1,createdAt:1}).lean<any[]>();
    const hasOwner=rows.some(r=>r.userId.toString()===a.ownerId.toString());
    const normalized=hasOwner?rows:[{_id:`owner:${a.ownerId.toString()}`,shopId:a.shopId,userId:a.ownerId,role:'OWNER',permissions:[...SHOP_ROLE_DEFAULTS.OWNER],status:'ACTIVE',joinedAt:a.shop.createdAt,createdAt:a.shop.createdAt} as any,...rows];
    const ids=normalized.map(r=>r.userId);
    const users=ids.length?await this.users.find({_id:{$in:ids}}).select({email:1,fullName:1,avatar:1,status:1}).lean<any[]>():[];
    const map=new Map(users.map(u=>[u._id.toString(),u]));
    return{shop:{_id:a.shopId.toString(),name:a.shop.name},items:normalized.map(r=>({...r,_id:r._id?.toString?.()||String(r._id),userId:r.userId.toString(),user:map.get(r.userId.toString())||null})),availablePermissions:SHOP_PERMISSIONS,roleDefaults:SHOP_ROLE_DEFAULTS};
  }
  async addTeam(userId:string,d:any){const a=await this.shopAccess.require(userId,['TEAM_MANAGE']);const user=await this.users.findOne({email:d.email.toLowerCase().trim(),status:'ACTIVE'});if(!user)throw new NotFoundException('USER_NOT_FOUND');if(user._id.toString()===a.ownerId.toString())throw new ConflictException('OWNER_ALREADY_MEMBER');if(await this.members.exists({shopId:a.shopId,userId:user._id}))throw new ConflictException('SHOP_MEMBER_EXISTS');const permissions=d.permissions?.length?d.permissions:SHOP_ROLE_DEFAULTS[d.role];const row=await this.members.create({shopId:a.shopId,userId:user._id,role:d.role,permissions,status:'ACTIVE',invitedBy:this.oid(userId),joinedAt:new Date()});if(!user.roles.includes('SELLER')){user.roles.push('SELLER');await user.save();}return{...row.toObject(),_id:row._id.toString(),userId:user._id.toString(),user:{email:user.email,fullName:user.fullName}};}
  async updateTeam(userId:string,memberId:string,d:any){const a=await this.shopAccess.require(userId,['TEAM_MANAGE']);const row=await this.members.findOne({_id:memberId,shopId:a.shopId});if(!row)throw new NotFoundException('SHOP_MEMBER_NOT_FOUND');if(row.role==='OWNER')throw new ForbiddenException('OWNER_CANNOT_BE_EDITED');if(d.role)row.role=d.role;if(d.status)row.status=d.status;if(d.permissions)row.permissions=d.permissions;else if(d.role)row.permissions=SHOP_ROLE_DEFAULTS[d.role];await row.save();return row;}
  async removeTeam(userId:string,memberId:string){const a=await this.shopAccess.require(userId,['TEAM_MANAGE']);const row=await this.members.findOne({_id:memberId,shopId:a.shopId});if(!row)throw new NotFoundException('SHOP_MEMBER_NOT_FOUND');if(row.role==='OWNER')throw new ForbiddenException('OWNER_CANNOT_BE_REMOVED');await row.deleteOne();return{removed:true};}
  async listAdmins(){const users=await this.users.find({roles:{$in:['ADMIN','SUPER_ADMIN']}}).select({email:1,fullName:1,roles:1,status:1,lastLoginAt:1}).lean<any[]>();const profiles=await this.admins.find({userId:{$in:users.map(u=>u._id)}}).lean<any[]>();const map=new Map(profiles.map(p=>[p.userId.toString(),p]));return{items:users.map(u=>({...u,_id:u._id.toString(),access:map.get(u._id.toString())||{permissions:[],status:'ACTIVE'}})),availablePermissions:ADMIN_PERMISSIONS};}
  async createAdmin(actorId:string,d:any){
    const user=await this.users.findOne({email:d.email.toLowerCase().trim()});
    if(!user)throw new NotFoundException('USER_NOT_FOUND');
    if(user._id.toString()===actorId)throw new ForbiddenException('CANNOT_EDIT_OWN_ADMIN_ACCESS');
    if(user.roles.includes('SUPER_ADMIN'))throw new ForbiddenException('SUPER_ADMIN_ACCESS_IMMUTABLE');
    if(!user.roles.includes('ADMIN')){user.roles.push('ADMIN');await user.save();}
    const row=await this.admins.findOneAndUpdate({userId:user._id},{$set:{permissions:d.permissions,status:'ACTIVE',updatedBy:this.oid(actorId)}},{upsert:true,new:true});
    return{user:{_id:user._id.toString(),email:user.email,fullName:user.fullName,roles:user.roles},access:row};
  }
  async updateAdmin(actorId:string,targetId:string,d:any){if(actorId===targetId)throw new ForbiddenException('CANNOT_EDIT_OWN_ADMIN_ACCESS');const user=await this.users.findById(targetId);if(!user||(!user.roles.includes('ADMIN')&&!user.roles.includes('SUPER_ADMIN')))throw new NotFoundException('ADMIN_NOT_FOUND');if(user.roles.includes('SUPER_ADMIN'))throw new ForbiddenException('SUPER_ADMIN_ACCESS_IMMUTABLE');const row=await this.admins.findOneAndUpdate({userId:user._id},{$set:{...(d.permissions?{permissions:d.permissions}:{}),...(d.status?{status:d.status}:{}),updatedBy:this.oid(actorId)}},{upsert:true,new:true});return row;}
}
