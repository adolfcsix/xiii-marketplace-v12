import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketplaceSettings, MarketplaceSettingsSchema } from './marketplace-settings.schema';
import { AdminSettingsController, PublicSettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
@Global()
@Module({imports:[MongooseModule.forFeature([{name:MarketplaceSettings.name,schema:MarketplaceSettingsSchema}])],controllers:[PublicSettingsController,AdminSettingsController],providers:[SettingsService],exports:[SettingsService]})
export class SettingsModule{}
