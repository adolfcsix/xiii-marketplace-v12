import { IsDateString, IsOptional } from 'class-validator';

export class AnalyticsRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
