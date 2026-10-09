import { ArrayMaxSize, IsArray, IsIn, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckoutPreviewDto {
  @IsMongoId()
  addressId: string;

  @IsIn(['STANDARD', 'EXPRESS'])
  shippingMethod: 'STANDARD' | 'EXPRESS';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  voucherCode?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  shopVoucherCodes?: string[];
}

export class CreateCheckoutDto extends CheckoutPreviewDto {
  @IsIn(['COD', 'MOMO', 'VNPAY'])
  paymentMethod: 'COD' | 'MOMO' | 'VNPAY';
}
