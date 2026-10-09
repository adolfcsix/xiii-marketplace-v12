import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { Product, ProductSchema } from '../products/product.schema';
import { Voucher, VoucherSchema } from '../vouchers/voucher.schema';
import { PromotionCampaign, PromotionCampaignSchema } from './promotion.schema';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Shop.name, schema: ShopSchema }, { name: Product.name, schema: ProductSchema },
    { name: Voucher.name, schema: VoucherSchema }, { name: PromotionCampaign.name, schema: PromotionCampaignSchema },
  ])],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [MongooseModule, PromotionsService],
})
export class PromotionsModule {}
