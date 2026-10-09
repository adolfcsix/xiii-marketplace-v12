import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateProductDto {
  @IsString() categoryId: string;
  @IsOptional() @IsString() brandId?: string | null;
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsObject() attributes?: Record<string, unknown>;
}

export class UpdateProductDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brandId?: string | null;
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsObject() attributes?: Record<string, unknown>;
  @IsOptional() @IsIn(['DRAFT', 'PENDING_REVIEW', 'HIDDEN']) status?: string;
}

export class CatalogVariantDto {
  @IsString() @MinLength(1) sku: string;
  @IsObject() attributes: Record<string, string>;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsNumber() @Min(0) compareAtPrice?: number;
  @IsOptional() @IsNumber() @Min(0) weight?: number;
  @IsOptional() @IsString() image?: string;
  @IsInt() @Min(0) initialAvailable: number;
  @IsOptional() @IsInt() @Min(0) lowStockThreshold?: number;
}

export class CreateCatalogProductDto {
  @ValidateNested() @Type(() => CreateProductDto) product: CreateProductDto;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CatalogVariantDto) variants: CatalogVariantDto[];
  @IsOptional() @IsBoolean() submitForReview?: boolean;
}

export class AdminApproveProductDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class AdminRejectProductDto {
  @IsString() @MinLength(5) @MaxLength(1000) reason: string;
}
