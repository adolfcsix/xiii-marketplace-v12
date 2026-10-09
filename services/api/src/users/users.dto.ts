import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatar?: string;
}

export class AddressDto {
  @IsString() recipientName: string;
  @IsString() phone: string;
  @IsString() province: string;
  @IsString() district: string;
  @IsString() ward: string;
  @IsString() addressLine: string;
  @IsOptional() @IsIn(['HOME', 'WORK', 'OTHER']) label?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class AdminUserQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['ACTIVE', 'BLOCKED', 'PENDING']) status?: string;
  @IsOptional() @IsIn(['BUYER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']) role?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class AdminUserStatusDto {
  @IsIn(['ACTIVE', 'BLOCKED', 'PENDING']) status: string;
}

export class AdminUserVerificationDto {
  @IsOptional() @IsBoolean() emailVerified?: boolean;
  @IsOptional() @IsBoolean() phoneVerified?: boolean;
}
