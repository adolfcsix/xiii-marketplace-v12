import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { MarketplaceSettings } from './marketplace-settings.schema';

export const DEFAULT_MARKETPLACE_SETTINGS = {
  standardShippingFee: 25000,
  expressShippingFee: 45000,
  paymentExpiresMinutes: 15,
  codEnabled: true,
  momoEnabled: true,
  vnpayEnabled: true,
};

@Injectable()
export class SettingsService {
  constructor(@InjectModel(MarketplaceSettings.name) private settings: Model<MarketplaceSettings>) {}
  async get(session?: ClientSession) {
    const q=this.settings.findOne({key:'marketplace'}); if(session)q.session(session); const row=await q.lean<any>();
    return row ? { ...DEFAULT_MARKETPLACE_SETTINGS, ...row, _id: row._id?.toString?.() } : { ...DEFAULT_MARKETPLACE_SETTINGS };
  }
  async update(actorId:string,d:any){
    const row=await this.settings.findOneAndUpdate({key:'marketplace'},{$set:{...d,updatedBy:new Types.ObjectId(actorId)}},{upsert:true,new:true,setDefaultsOnInsert:true}).lean<any>();
    return { ...DEFAULT_MARKETPLACE_SETTINGS, ...row, _id: row?._id?.toString?.() };
  }
  async publicConfig(){
    const s=await this.get();
    return { standardShippingFee:s.standardShippingFee,expressShippingFee:s.expressShippingFee,paymentExpiresMinutes:s.paymentExpiresMinutes,codEnabled:s.codEnabled,momoEnabled:s.momoEnabled,vnpayEnabled:s.vnpayEnabled };
  }
}
