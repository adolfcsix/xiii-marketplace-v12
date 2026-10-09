import { SetMetadata } from '@nestjs/common';
import { ADMIN_PERMISSIONS_KEY, AdminPermission, SHOP_PERMISSIONS_KEY, ShopPermission } from './access.constants';
export const ShopPermissions = (...permissions: ShopPermission[]) => SetMetadata(SHOP_PERMISSIONS_KEY, permissions);
export const AdminPermissions = (...permissions: AdminPermission[]) => SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);
