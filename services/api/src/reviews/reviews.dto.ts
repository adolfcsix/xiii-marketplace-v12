import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
import { PageDto } from '../common/dto/page.dto';
import { REVIEW_STATUSES } from './customer-review.schema';

export class CreateReviewDto {
  @IsString() orderItemId!: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsUrl({}, { each: true }) media?: string[];
}

export class ListBuyerReviewsDto extends PageDto {
  @IsOptional() @IsIn(['PENDING','REVIEWED']) status?: 'PENDING'|'REVIEWED';
}

export class ListPublicReviewsDto extends PageDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
}

export class ListSellerReviewsDto extends PageDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsIn(['REPLIED','UNREPLIED']) reply?: 'REPLIED'|'UNREPLIED';
}

export class SellerReplyDto { @IsString() @MaxLength(1200) reply!: string; }

export class ListAdminReviewsDto extends PageDto {
  @IsOptional() @IsIn([...REVIEW_STATUSES]) status?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
}

export class ModerateReviewDto {
  @IsIn(['PUBLISHED','HIDDEN']) status!: 'PUBLISHED'|'HIDDEN';
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
