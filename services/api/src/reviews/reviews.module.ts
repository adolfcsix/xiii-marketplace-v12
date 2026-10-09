import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/user.schema';
import { Order, OrderItem, OrderItemSchema, OrderSchema, SubOrder, SubOrderSchema } from '../orders/order.schema';
import { Product, ProductSchema } from '../products/product.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { CustomerReview, CustomerReviewSchema } from './customer-review.schema';
import { AdminReviewsController, ReviewsController, SellerReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports:[MongooseModule.forFeature([
    {name:CustomerReview.name,schema:CustomerReviewSchema},{name:Order.name,schema:OrderSchema},{name:SubOrder.name,schema:SubOrderSchema},
    {name:OrderItem.name,schema:OrderItemSchema},{name:Product.name,schema:ProductSchema},{name:Shop.name,schema:ShopSchema},{name:User.name,schema:UserSchema},
  ])],
  controllers:[ReviewsController,SellerReviewsController,AdminReviewsController],providers:[ReviewsService],exports:[ReviewsService],
})
export class ReviewsModule {}
