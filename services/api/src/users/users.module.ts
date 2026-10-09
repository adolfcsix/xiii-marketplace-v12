import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/user.schema';
import { SellerApplication, SellerApplicationSchema } from '../sellers/seller-application.schema';
import { ShopMember, ShopMemberSchema } from '../access-control/shop-member.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { Address, AddressSchema } from './address.schema';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: User.name, schema: UserSchema }, { name: Address.name, schema: AddressSchema },
    { name: SellerApplication.name, schema: SellerApplicationSchema }, { name: ShopMember.name, schema: ShopMemberSchema }, { name: Shop.name, schema: ShopSchema },
  ])],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService], exports: [UsersService],
})
export class UsersModule {}
