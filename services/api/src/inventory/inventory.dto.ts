import { IsInt, IsOptional, IsString, Min } from 'class-validator';
export class AdjustInventoryDto {
  @IsInt() @Min(0) available: number;
  @IsOptional() @IsInt() @Min(0) lowStockThreshold?: number;
  @IsOptional() @IsInt() @Min(0) expectedAvailable?: number;
  @IsOptional() @IsString() note?: string;
}
