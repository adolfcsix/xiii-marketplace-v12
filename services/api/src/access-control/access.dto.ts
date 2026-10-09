import { ArrayUnique, IsArray, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ADMIN_PERMISSIONS, SHOP_PERMISSIONS } from './access.constants';

export class AddShopMemberDto {
  @IsEmail() email: string;
  @IsIn(['MANAGER','STAFF']) role: 'MANAGER'|'STAFF';
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(SHOP_PERMISSIONS, { each: true }) permissions?: string[];
}
export class UpdateShopMemberDto {
  @IsOptional() @IsIn(['MANAGER','STAFF']) role?: 'MANAGER'|'STAFF';
  @IsOptional() @IsIn(['ACTIVE','SUSPENDED']) status?: 'ACTIVE'|'SUSPENDED';
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(SHOP_PERMISSIONS, { each: true }) permissions?: string[];
}
export class CreateAdminAccessDto {
  @IsEmail() email: string;
  @IsArray() @ArrayUnique() @IsIn(ADMIN_PERMISSIONS, { each: true }) permissions: string[];
}
export class UpdateAdminAccessDto {
  @IsOptional() @IsArray() @ArrayUnique() @IsIn(ADMIN_PERMISSIONS, { each: true }) permissions?: string[];
  @IsOptional() @IsIn(['ACTIVE','SUSPENDED']) status?: 'ACTIVE'|'SUSPENDED';
}
export class AuditQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() actorId?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30;
}
