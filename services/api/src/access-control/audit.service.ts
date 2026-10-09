import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog } from './audit-log.schema';
@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private logs:Model<AuditLog>){}
  async recordSafe(input:any){try{await this.logs.create(input);}catch{}}
  async list(q:{q?:string;actorId?:string;method?:string;page?:number;limit?:number}){
    const page=Math.max(1,q.page||1),limit=Math.min(100,Math.max(1,q.limit||30)); const filter:any={};
    if(q.actorId&&Types.ObjectId.isValid(q.actorId))filter.actorId=new Types.ObjectId(q.actorId);
    if(q.method)filter.method=q.method.toUpperCase();
    if(q.q?.trim()){const rx=new RegExp(q.q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');filter.$or=[{path:rx},{action:rx},{actorEmail:rx},{resourceType:rx},{resourceId:rx}];}
    const [items,total]=await Promise.all([this.logs.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean<any[]>(),this.logs.countDocuments(filter)]);
    return {items:items.map(x=>({...x,_id:x._id.toString(),actorId:x.actorId?.toString?.(),shopId:x.shopId?.toString?.()})),meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
  }
}
