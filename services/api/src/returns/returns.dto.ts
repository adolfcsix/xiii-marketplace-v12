import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { PageDto } from '../common/dto/page.dto';
import { DISPUTE_STATUSES, REFUND_STATUSES, RETURN_REASONS, RETURN_STATUSES } from './return.schema';

export class ReturnItemDto {
  @IsString() orderItemId!: string;
  @IsInt() @Min(1) @Max(99) quantity!: number;
}
export class CreateReturnDto {
  @IsString() subOrderCode!: string;
  @IsIn([...RETURN_REASONS]) reason!: string;
  @IsOptional() @IsString() @MaxLength(1000) detail?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ReturnItemDto) items!: ReturnItemDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsUrl({}, { each: true }) evidenceUrls?: string[];
}
export class ListReturnsDto extends PageDto {
  @IsOptional() @IsIn([...RETURN_STATUSES]) status?: string;
}
export class SellerDecisionDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class SellerRejectDto {
  @IsString() @MaxLength(500) reason!: string;
}
export class ReturnShipmentDto {
  @IsString() @MaxLength(60) provider!: string;
  @IsString() @MaxLength(100) trackingCode!: string;
}
export class CreateDisputeDto {
  @IsString() @MaxLength(200) reason!: string;
  @IsOptional() @IsString() @MaxLength(1500) detail?: string;
}
export class ListDisputesDto extends PageDto {
  @IsOptional() @IsIn([...DISPUTE_STATUSES]) status?: string;
}
export class ResolveDisputeDto {
  @IsIn(['BUYER','SELLER']) outcome!: 'BUYER'|'SELLER';
  @IsString() @MaxLength(1200) note!: string;
}
export class ListRefundsDto extends PageDto {
  @IsOptional() @IsIn([...REFUND_STATUSES]) status?: string;
}
export class ProcessRefundDto {
  @IsString() @MaxLength(120) externalReference!: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
export class FailRefundDto {
  @IsString() @MaxLength(1000) reason!: string;
}
