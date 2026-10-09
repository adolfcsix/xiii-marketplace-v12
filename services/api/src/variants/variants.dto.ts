import { IsIn, IsNumber, IsObject, IsOptional, IsString, Matches, Min } from 'class-validator';
export class VariantDto {
    @IsString()
    @Matches(/\S/)
    sku: string;
    @IsObject()
    attributes: Record<string, string>;
    @IsNumber()
    @Min(0)
    price: number;
    @IsOptional()
    @IsNumber()
    @Min(0)
    compareAtPrice?: number;
    @IsOptional()
    @IsNumber()
    @Min(0)
    weight?: number;
    @IsOptional()
    @IsString()
    image?: string;
    @IsOptional()
    @IsIn(['ACTIVE', 'DISABLED'])
    status?: string;
}
export class UpdateVariantDto {
    @IsOptional()
    @IsString()
    @Matches(/\S/)
    sku?: string;
    @IsOptional()
    @IsObject()
    attributes?: Record<string, string>;
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;
    @IsOptional()
    @IsNumber()
    @Min(0)
    compareAtPrice?: number | null;
    @IsOptional()
    @IsNumber()
    @Min(0)
    weight?: number;
    @IsOptional()
    @IsString()
    image?: string;
    @IsOptional()
    @IsIn(['ACTIVE', 'DISABLED'])
    status?: string;
}

