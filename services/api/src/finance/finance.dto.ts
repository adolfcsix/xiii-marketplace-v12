import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PageDto } from '../common/dto/page.dto';
import { LEDGER_STATUSES, LEDGER_TYPES, WITHDRAWAL_STATUSES } from './finance.schema';

export class ListLedgerDto extends PageDto {
  @IsOptional() @IsIn([...LEDGER_TYPES]) type?: string;
  @IsOptional() @IsIn([...LEDGER_STATUSES]) status?: string;
}
export class SavePayoutAccountDto {
  @IsString() @MaxLength(30) bankCode!: string;
  @IsOptional() @IsString() @MaxLength(100) bankName?: string;
  @IsString() @MaxLength(150) accountName!: string;
  @IsString() @MaxLength(40) accountNumber!: string;
}
export class CreateWithdrawalDto {
  @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}
export class ListWithdrawalsDto extends PageDto {
  @IsOptional() @IsIn([...WITHDRAWAL_STATUSES]) status?: string;
}
export class RejectWithdrawalDto {
  @IsString() @MaxLength(700) reason!: string;
}
export class MarkPaidWithdrawalDto {
  @IsString() @MaxLength(150) externalReference!: string;
  @IsOptional() @IsString() @MaxLength(700) note?: string;
}
export class UpdateFinanceSettingsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(5000) commissionRateBps?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(30) settlementDelayDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minWithdrawalAmount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxWithdrawalAmount?: number;
}
