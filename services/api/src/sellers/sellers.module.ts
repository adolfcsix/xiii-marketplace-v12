import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SellerApplication, SellerApplicationSchema } from './seller-application.schema';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { User, UserSchema } from '../auth/user.schema';
import { ShopMember, ShopMemberSchema } from '../access-control/shop-member.schema';
@Module({ imports: [MongooseModule.forFeature([{ name: SellerApplication.name, schema: SellerApplicationSchema }, { name: Shop.name, schema: ShopSchema }, { name: User.name, schema: UserSchema }, { name: ShopMember.name, schema: ShopMemberSchema }])], controllers: [SellersController], providers: [SellersService] })
export class SellersModule {
}

