import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class ApplySellerDto {
  @IsIn(['INDIVIDUAL', 'BUSINESS']) sellerType: string;
  @IsString() @MinLength(2) shopName: string;
  @IsIn(['CCCD', 'PASSPORT']) identityType: string;
  @IsString() identityNumber: string;
  @IsString() identityFrontImage: string;
  @IsOptional() @IsString() identityBackImage?: string;
  @IsString() selfieImage: string;
  @IsOptional() @IsString() taxCode?: string;
  @IsObject() address: Record<string, unknown>;
}

export class ReviewSellerDto {
  @IsOptional() @IsString() reason?: string;
}

export class SellerApplicationQueryDto {
  @IsOptional() @IsIn(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']) status?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
