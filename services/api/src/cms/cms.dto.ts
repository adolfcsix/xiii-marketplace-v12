import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class BannerDto {
  @IsString() key: string;
  @IsIn(['HERO','PROMO','EDITORIAL']) placement: 'HERO'|'PROMO'|'EDITORIAL';
  @IsString() title: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() eyebrow?: string;
  @IsString() image: string;
  @IsOptional() @IsString() mobileImage?: string;
  @IsOptional() @IsString() href?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() startAt?: string;
  @IsOptional() @IsString() endAt?: string;
  @IsOptional() @IsString() adminNote?: string;
}

export class SectionDto {
  @IsString() key: string;
  @IsString() title: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsIn(['CATEGORY_RAIL','PRODUCT_GRID','BANNER_GRID','BENEFIT_STRIP','CUSTOM']) type: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}
