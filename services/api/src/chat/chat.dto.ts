import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class StartConversationDto {
  @IsMongoId() shopId: string;
  @IsOptional() @IsMongoId() productId?: string;
  @IsOptional() @IsString() @MaxLength(80) orderCode?: string;
}
export class SendMessageDto {
  @IsOptional() @IsString() @MaxLength(2000) text?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(4) @IsString({ each: true }) attachments?: string[];
  @IsOptional() @IsIn(['TEXT','PRODUCT','ORDER']) type?: string;
  @IsOptional() @IsMongoId() productId?: string;
  @IsOptional() @IsString() @MaxLength(80) orderCode?: string;
}
export class ListConversationsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30;
}
export class ListMessagesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}
