import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SellersModule } from './sellers/sellers.module';
import { ShopsModule } from './shops/shops.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { ProductsModule } from './products/products.module';
import { VariantsModule } from './variants/variants.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { PaymentsModule } from './payments/payments.module';
import { ReturnsModule } from './returns/returns.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { FinanceModule } from './finance/finance.module';
import { PromotionsModule } from './promotions/promotions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CmsModule } from './cms/cms.module';
import { AccessControlModule } from './access-control/access-control.module';
import { AuditInterceptor } from './access-control/audit.interceptor';
import { SettingsModule } from './settings/settings.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { CommonModule } from './common/common.module';
import { HealthController } from './health.controller';
import { validateEnv } from './common/config/env.validation';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { RequestLoggingInterceptor } from './common/logging/request-logging.interceptor';
import { RateLimitModule } from './common/rate-limit/rate-limit.module';
import { RateLimitGuard } from './common/rate-limit/rate-limit.guard';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'], validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        uri: c.get('MONGODB_URI', 'mongodb://localhost:27017/xiii_marketplace?replicaSet=rs0'),
        serverSelectionTimeoutMS: Number(c.get('MONGODB_SERVER_SELECTION_TIMEOUT_MS', 5000)),
        maxPoolSize: Number(c.get('MONGODB_MAX_POOL_SIZE', 30)),
        minPoolSize: Number(c.get('MONGODB_MIN_POOL_SIZE', 2)),
      }),
    }),
    RateLimitModule,
    CommonModule,
    AccessControlModule,
    SettingsModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    SellersModule,
    ShopsModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    VariantsModule,
    InventoryModule,
    CartModule,
    VouchersModule,
    OrdersModule,
    CheckoutModule,
    PaymentsModule,
    ReturnsModule,
    ReviewsModule,
    ChatModule,
    FinanceModule,
    PromotionsModule,
    AnalyticsModule,
    CmsModule,
    StorageModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
