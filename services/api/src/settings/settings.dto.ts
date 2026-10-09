import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
export class UpdateMarketplaceSettingsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000000) standardShippingFee?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000000) expressShippingFee?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(120) paymentExpiresMinutes?: number;
  @IsOptional() @IsBoolean() codEnabled?: boolean;
  @IsOptional() @IsBoolean() momoEnabled?: boolean;
  @IsOptional() @IsBoolean() vnpayEnabled?: boolean;
}
