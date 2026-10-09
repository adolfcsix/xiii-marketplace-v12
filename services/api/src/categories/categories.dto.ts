import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
export class CategoryDto {
    @IsString()
    name: string;
    @IsOptional()
    @IsString()
    parentId?: string;
    @IsOptional()
    @IsString()
    image?: string;
    @IsOptional()
    @IsString()
    icon?: string;
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    sortOrder?: number;
    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

