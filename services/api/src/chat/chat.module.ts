import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../auth/user.schema';
import { Order, OrderSchema, SubOrder, SubOrderSchema } from '../orders/order.schema';
import { Product, ProductSchema } from '../products/product.schema';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { BuyerChatController, SellerChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatMessage, ChatMessageSchema, Conversation, ConversationSchema } from './chat.schema';
import { ChatService } from './chat.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema }, { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: User.name, schema: UserSchema }, { name: Shop.name, schema: ShopSchema }, { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema }, { name: SubOrder.name, schema: SubOrderSchema },
    ]),
  ],
  controllers: [BuyerChatController, SellerChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
