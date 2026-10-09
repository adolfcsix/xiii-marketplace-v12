import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { HomeBanner, HomeBannerSchema } from './home-banner.schema';
import { HomeSection, HomeSectionSchema } from './home-section.schema';

@Module({
  imports:[MongooseModule.forFeature([
    { name: HomeBanner.name, schema: HomeBannerSchema },
    { name: HomeSection.name, schema: HomeSectionSchema },
  ])],
  controllers:[CmsController], providers:[CmsService], exports:[CmsService]
})
export class CmsModule {}
