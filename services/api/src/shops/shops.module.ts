import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from './shop.schema';
import { Category, CategorySchema } from '../categories/category.schema';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Shop.name, schema: ShopSchema }, { name: Category.name, schema: CategorySchema }])],
  controllers: [ShopsController], providers: [ShopsService], exports: [MongooseModule, ShopsService],
})
export class ShopsModule {}
