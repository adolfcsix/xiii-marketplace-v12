import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { randomUUID } from 'crypto';
import { CreateUploadUrlDto, UploadPurpose } from './storage.dto';

export const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export const LIMITS: Record<UploadPurpose, number> = {
  PRODUCT_IMAGE: 10 * 1024 * 1024,
  SHOP_LOGO: 5 * 1024 * 1024,
  SHOP_BANNER: 10 * 1024 * 1024,
  AVATAR: 5 * 1024 * 1024,
  REVIEW_IMAGE: 10 * 1024 * 1024,
  RETURN_IMAGE: 10 * 1024 * 1024,
  CMS_BANNER: 12 * 1024 * 1024,
  CATEGORY_IMAGE: 8 * 1024 * 1024,
  BRAND_LOGO: 5 * 1024 * 1024,
};

@Injectable()
export class StorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(private readonly config: ConfigService) {
    const enabled = config.get('STORAGE_DRIVER', 's3') === 's3';
    this.bucket = config.get('STORAGE_BUCKET', '');
    this.publicBase = String(config.get('STORAGE_PUBLIC_BASE_URL', '')).replace(/\/$/, '');
    this.client = enabled ? new S3Client({
      region: config.get('STORAGE_REGION', 'auto'),
      endpoint: config.get('STORAGE_ENDPOINT') || undefined,
      forcePathStyle: String(config.get('STORAGE_FORCE_PATH_STYLE', 'false')) === 'true',
      credentials: config.get('STORAGE_ACCESS_KEY_ID') ? {
        accessKeyId: config.get('STORAGE_ACCESS_KEY_ID')!,
        secretAccessKey: config.get('STORAGE_SECRET_ACCESS_KEY')!,
      } : undefined,
    }) : null;
  }

  async createUpload(userId: string, dto: CreateUploadUrlDto) {
    if (!this.client || !this.bucket || !this.publicBase) throw new ServiceUnavailableException({ code: 'STORAGE_NOT_CONFIGURED', message: 'Object storage is not configured.' });
    const type=dto.contentType.trim().toLowerCase();
    const contentType=({'image/jpg':'image/jpeg','image/pjpeg':'image/jpeg','image/jfif':'image/jpeg','image/x-png':'image/png'} as Record<string,string>)[type]||type;
    const ext = Object.prototype.hasOwnProperty.call(MIME_EXTENSION, contentType) ? MIME_EXTENSION[contentType] : undefined;
    if (!ext) throw new BadRequestException({ code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Chỉ hỗ trợ JPG/JPEG, PNG, WebP, GIF và AVIF.' });
    const maxBytes = LIMITS[dto.purpose];
    if (dto.sizeBytes > maxBytes) throw new BadRequestException({ code: 'FILE_TOO_LARGE', message: `Ảnh vượt quá ${maxBytes / (1024 * 1024)} MB cho mục này.` });
    if (!/^[^\\/]{1,180}$/.test(dto.fileName)) throw new BadRequestException({ code: 'INVALID_FILE_NAME', message: 'Invalid file name.' });

    const now = new Date();
    const ownerHash = Buffer.from(userId).toString('base64url').slice(0, 18);
    const key = `uploads/${dto.purpose.toLowerCase()}/${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}/${ownerHash}-${randomUUID()}.${ext}`;
    const expiresIn = Number(this.config.get('STORAGE_UPLOAD_URL_TTL_SECONDS', 300));
    const presigned = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn,
      Fields: { 'Content-Type': contentType, 'Cache-Control': 'public,max-age=31536000,immutable' },
      Conditions: [
        ['content-length-range', 1, Math.min(maxBytes, dto.sizeBytes)],
        ['eq', '$Content-Type', contentType],
      ],
    });
    return {
      uploadUrl: presigned.url,
      fields: presigned.fields,
      publicUrl: `${this.publicBase}/${key}`,
      objectKey: key,
      method: 'POST',
      expiresIn,
      maxBytes,
    };
  }

  artworkConfigured() { return Boolean(this.client && this.bucket && this.publicBase); }

  productImageKey(url: string) {
    // Read only our configured bucket; never fetch seller-supplied hosts or private URLs.
    const prefix = this.publicBase + '/';
    if (!this.artworkConfigured() || !url.startsWith(prefix)) throw new BadRequestException('Hãy upload ảnh SKU vào kho ảnh của website và lưu SKU trước.');
    const key = url.slice(prefix.length);
    if (!/^uploads\/product_image\/\d{4}\/\d{2}\/[A-Za-z0-9_-]+\.(png|jpg|webp|avif)$/.test(key)) throw new BadRequestException('Ảnh SKU không thuộc kho ảnh sản phẩm được hỗ trợ.');
    return key;
  }

  async readProductImage(url: string) {
    const key = this.productImageKey(url);
    const result = await this.client!.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: AbortSignal.timeout(30_000) });
    if (!result.Body || !result.ContentLength || result.ContentLength > LIMITS.PRODUCT_IMAGE) throw new BadRequestException('Ảnh SKU trống hoặc vượt quá 10 MB.');
    const bytes = Buffer.from(await result.Body.transformToByteArray());
    if (bytes.length > LIMITS.PRODUCT_IMAGE) throw new BadRequestException('Ảnh SKU vượt quá 10 MB.');
    return bytes;
  }

  async storeArtwork(jobId: string, bytes: Buffer) {
    if (!this.artworkConfigured()) throw new ServiceUnavailableException('Kho ảnh chưa được cấu hình.');
    const key = `artwork/ai/${jobId}.png`;
    await this.client!.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: 'image/png', CacheControl: 'public,max-age=31536000,immutable' }), { abortSignal: AbortSignal.timeout(30_000) });
    return `${this.publicBase}/${key}`;
  }
}
