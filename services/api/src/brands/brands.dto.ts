import { IsBoolean, IsOptional, IsString } from 'class-validator';
export class BrandDto {
    @IsString()
    name: string;
    @IsOptional()
    @IsString()
    logo?: string;
    @IsOptional()
    @IsString()
    description?: string;
    @IsOptional()
    @IsBoolean()
    verified?: boolean;
    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

