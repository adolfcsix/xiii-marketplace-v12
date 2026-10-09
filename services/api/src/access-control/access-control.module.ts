import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from '../shops/shop.schema';
import { User, UserSchema } from '../auth/user.schema';
import { ShopMember, ShopMemberSchema } from './shop-member.schema';
import { AdminAccess, AdminAccessSchema } from './admin-access.schema';
import { AuditLog, AuditLogSchema } from './audit-log.schema';
import { ShopAccessService } from './shop-access.service';
import { ShopPermissionsGuard, AdminPermissionsGuard } from './access.guards';
import { AccessService } from './access.service';
import { AuditService } from './audit.service';
import { SellerAccessController, AdminAccessController } from './access.controller';
@Global()
@Module({
  imports:[MongooseModule.forFeature([{name:Shop.name,schema:ShopSchema},{name:User.name,schema:UserSchema},{name:ShopMember.name,schema:ShopMemberSchema},{name:AdminAccess.name,schema:AdminAccessSchema},{name:AuditLog.name,schema:AuditLogSchema}])],
  controllers:[SellerAccessController,AdminAccessController],
  providers:[ShopAccessService,ShopPermissionsGuard,AdminPermissionsGuard,AccessService,AuditService],
  exports:[ShopAccessService,ShopPermissionsGuard,AdminPermissionsGuard,AuditService,MongooseModule]
})
export class AccessControlModule{}
