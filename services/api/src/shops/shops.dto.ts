import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateShopDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() logo?: string;
  @IsOptional() @IsString() banner?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) businessCategories?: string[];
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(14) orderPreparationDays?: number;
  @IsOptional() @IsString() returnPolicy?: string;
}
