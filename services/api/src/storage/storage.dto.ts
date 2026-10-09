import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';

export const uploadPurposes = ['PRODUCT_IMAGE','SHOP_LOGO','SHOP_BANNER','AVATAR','REVIEW_IMAGE','RETURN_IMAGE','CMS_BANNER','CATEGORY_IMAGE','BRAND_LOGO'] as const;
export type UploadPurpose = typeof uploadPurposes[number];

export class CreateUploadUrlDto {
  @IsIn(uploadPurposes)
  purpose: UploadPurpose;

  @IsString()
  fileName: string;

  @IsString()
  contentType: string;

  @IsInt()
  @Min(1)
  @Max(15 * 1024 * 1024)
  sizeBytes: number;
}
