import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @MaxLength(80)
  orderCode: string;

  @IsIn(['MOMO', 'VNPAY'])
  provider: 'MOMO' | 'VNPAY';
}
