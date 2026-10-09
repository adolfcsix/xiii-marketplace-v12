import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageDto } from '../common/dto/page.dto';
import { ORDER_STATUSES } from './order.schema';

export class ListOrdersDto extends PageDto {
  @IsOptional()
  @IsIn([...ORDER_STATUSES])
  status?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class ListSellerOrdersDto extends PageDto {
  @IsOptional()
  @IsIn([...ORDER_STATUSES])
  status?: string;
}

export const SELLER_FULFILMENT_STATUSES = ['CONFIRMED', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'] as const;
export const SHIPPING_PROVIDERS = ['GHN', 'GHTK', 'VIETTEL_POST', 'SELF', 'OTHER'] as const;

export class SellerUpdateOrderStatusDto {
  @IsIn([...SELLER_FULFILMENT_STATUSES])
  status!: string;

  @IsOptional()
  @IsIn([...SHIPPING_PROVIDERS])
  shippingProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  trackingCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class ListAdminOrdersDto extends PageDto {
  @IsOptional() @IsIn([...ORDER_STATUSES]) status?: string;
  @IsOptional() @IsIn(['PENDING','PROCESSING','SUCCESS','FAILED','CANCELLED','PARTIALLY_REFUNDED','REFUNDED']) paymentStatus?: string;
  @IsOptional() @IsIn(['COD','MOMO','VNPAY']) paymentMethod?: string;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
}
