import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SellerPromotionQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['ALL', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'DISABLED']) status: 'ALL'|'ACTIVE'|'SCHEDULED'|'EXPIRED'|'DISABLED' = 'ALL';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class CreateSellerVoucherDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{4,30}$/) code: string;
  @IsIn(['FIXED','PERCENT']) type: 'FIXED'|'PERCENT';
  @Type(() => Number) @IsNumber() @Min(1) value: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxDiscount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumSpend = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) quantity = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) perUserLimit = 1;
  @IsOptional() @IsIn(['ALL_PRODUCTS','SELECTED_PRODUCTS']) scope: 'ALL_PRODUCTS'|'SELECTED_PRODUCTS' = 'ALL_PRODUCTS';
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsMongoId({ each: true }) productIds: string[] = [];
  @IsDateString() startAt: string;
  @IsDateString() endAt: string;
  @IsOptional() @IsBoolean() active = true;
}

export class UpdateSellerVoucherDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsIn(['FIXED','PERCENT']) type?: 'FIXED'|'PERCENT';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) value?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxDiscount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumSpend?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) quantity?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) perUserLimit?: number;
  @IsOptional() @IsIn(['ALL_PRODUCTS','SELECTED_PRODUCTS']) scope?: 'ALL_PRODUCTS'|'SELECTED_PRODUCTS';
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsMongoId({ each: true }) productIds?: string[];
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateCampaignDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsIn(['FIXED','PERCENT']) type: 'FIXED'|'PERCENT';
  @Type(() => Number) @IsNumber() @Min(1) value: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxDiscount?: number;
  @IsOptional() @IsIn(['ALL_PRODUCTS','SELECTED_PRODUCTS']) scope: 'ALL_PRODUCTS'|'SELECTED_PRODUCTS' = 'SELECTED_PRODUCTS';
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsMongoId({ each: true }) productIds: string[] = [];
  @IsDateString() startAt: string;
  @IsDateString() endAt: string;
  @IsOptional() @IsBoolean() active = true;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsIn(['FIXED','PERCENT']) type?: 'FIXED'|'PERCENT';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) value?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxDiscount?: number;
  @IsOptional() @IsIn(['ALL_PRODUCTS','SELECTED_PRODUCTS']) scope?: 'ALL_PRODUCTS'|'SELECTED_PRODUCTS';
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsMongoId({ each: true }) productIds?: string[];
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class TogglePromotionDto {
  @IsBoolean() active: boolean;
}
