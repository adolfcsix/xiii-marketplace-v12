import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductsService } from './products.service';
import { StorageService } from '../storage/storage.service';
import { AiArtworkJob, AiArtworkQuota } from './ai-artwork.schema';
import { ShopAccessService } from '../access-control/shop-access.service';
import { User } from '../auth/user.schema';
import { artworkFingerprint, artworkGuide, artworkPrompt, isPilotTop, normalizeArtwork, prepareProductPhoto, ArtworkForm } from './ai-artwork-image';

@Injectable()
export class AiArtworkService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private working = false;
  private stopping = false;
  private readonly logger = new Logger(AiArtworkService.name);
  constructor(
    @InjectModel(AiArtworkJob.name) private readonly jobs: Model<AiArtworkJob>,
    @InjectModel(AiArtworkQuota.name) private readonly quotas: Model<AiArtworkQuota>,
    private readonly products: ProductsService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly shopAccess: ShopAccessService,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  configuration() {
    const enabled = String(this.config.get('AI_OUTFIT_ENABLED', 'false')) === 'true';
    const ready = enabled && Boolean(this.config.get('OPENAI_API_KEY')) && this.storage.artworkConfigured();
    return { enabled: ready, reason: ready ? '' : 'AI mặc thử chưa được bật trên máy chủ. Cần cấu hình kho ảnh và khoá API.', pilot: 'TOPS_ONLY', dailyLimit: this.dailyLimit() };
  }
  private dailyLimit() {
    const value = Number(this.config.get('AI_OUTFIT_DAILY_LIMIT', 10));
    return Number.isInteger(value) && value > 0 ? Math.min(value, 100) : 10;
  }
  async availability(userId: string, productId: Types.ObjectId) {
    const p = await this.products.sellerOne(userId, productId);
    return { ...this.configuration(), supported: isPilotTop(p.name, String(p.category?.name || '')) };
  }
  private async source(userId: string, productId: Types.ObjectId, variantId: string, form: string, model: string) {
    // Background work must recheck account/permissions, not rely on the original HTTP guard.
    const actor = await this.users.findById(userId).select({ status: 1, roles: 1 }).lean();
    if (!actor || actor.status !== 'ACTIVE' || !actor.roles?.some(role => ['SELLER', 'ADMIN', 'SUPER_ADMIN'].includes(role))) throw new ForbiddenException('ACCOUNT_NOT_ACTIVE');
    await this.shopAccess.require(userId, ['PRODUCT_WRITE'], true);
    const product = await this.products.sellerOne(userId, productId);
    if (product.status === 'PENDING_REVIEW') throw new ConflictException('Sản phẩm đang chờ duyệt; hãy đợi duyệt xong.');
    if (!isPilotTop(product.name, String(product.category?.name || ''))) throw new BadRequestException('Bản thử nghiệm AI hiện chỉ hỗ trợ áo, hoodie và sweater.');
    const variant = product.variants.find(v => String(v._id) === variantId);
    if (!variant || variant.status !== 'ACTIVE') throw new BadRequestException('SKU không tồn tại hoặc đã ngừng bán.');
    // Require a photo saved on this exact SKU, never guess colour from a shared cover.
    const sourceUrl = String(variant.image || '');
    if (!sourceUrl) throw new BadRequestException('Hãy upload ảnh đúng màu vào SKU và lưu SKU trước khi tạo bằng AI.');
    this.storage.productImageKey(sourceUrl);
    return { product, variant, sourceUrl, fingerprint: artworkFingerprint(product.name, variantId, variant.attributes, sourceUrl, form, model) };
  }
  private publicJob(job: any) {
    return { id: String(job._id), productId: String(job.productId), variantId: job.variantId, form: job.form, status: job.status, sourceUrl: job.sourceUrl, outputUrl: job.outputUrl || '', error: job.error || '', reviewedAt: job.reviewedAt || null };
  }
  async create(userId: string, productId: Types.ObjectId, variantId: string, form: ArtworkForm, requestId: string) {
    if (!this.configuration().enabled) throw new ServiceUnavailableException(this.configuration().reason);
    const model = String(this.config.get('AI_OUTFIT_MODEL', 'gpt-image-1.5'));
    const { product, sourceUrl, fingerprint } = await this.source(userId, productId, variantId, form, model);
    const shopId = product.shopId;
    const previous = await this.jobs.findOne({ shopId, requestId }).lean();
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new ConflictException('Mã yêu cầu đã được dùng cho ảnh khác.');
      return this.publicJob(previous);
    }
    const cached = await this.jobs.findOne({ shopId, fingerprint, status: { $in: ['QUEUED', 'RUNNING', 'READY'] } }).lean();
    if (cached) return this.publicJob(cached);
    const now = new Date();
    const quotaId = `${shopId}:${now.toISOString().slice(0, 10)}`;
    // Separate initialization from reservation avoids duplicate-key upserts at the limit.
    try { await this.quotas.updateOne({ _id: quotaId }, { $setOnInsert: { used: 0, expiresAt: new Date(now.getTime() + 3 * 86400_000) } }, { upsert: true }); }
    catch (e) { if ((e as any)?.code !== 11000) throw e; }
    const reserved = await this.quotas.findOneAndUpdate({ _id: quotaId, used: { $lt: this.dailyLimit() } }, { $inc: { used: 1 } });
    if (!reserved) {
      const concurrent = await this.jobs.findOne({ shopId, fingerprint, status: { $in: ['QUEUED', 'RUNNING', 'READY'] } }).lean();
      if (concurrent) return this.publicJob(concurrent);
      throw new HttpException('Shop đã hết lượt tạo AI hôm nay (UTC).', HttpStatus.TOO_MANY_REQUESTS);
    }
    try {
      const job = await this.jobs.create({ shopId, productId, variantId, actorId: userId, requestId, form, fingerprint, sourceUrl, model, status: 'QUEUED' });
      return this.publicJob(job);
    } catch (e) {
      if ((e as any)?.code === 11000) {
        await this.quotas.updateOne({ _id: quotaId }, { $inc: { used: -1 } });
        const concurrent = await this.jobs.findOne({ shopId, fingerprint, status: { $in: ['QUEUED', 'RUNNING', 'READY'] } }).lean();
        if (concurrent) return this.publicJob(concurrent);
      }
      // An ambiguous network error may have inserted the job; retain its reservation.
      // Refunding here could allow more paid jobs than the daily cap.
      throw e;
    }
  }
  private async owned(userId: string, productId: Types.ObjectId, jobId: Types.ObjectId) {
    const product = await this.products.sellerOne(userId, productId);
    const job = await this.jobs.findOne({ _id: jobId, productId, shopId: product.shopId }).lean();
    if (!job) throw new NotFoundException('Không tìm thấy yêu cầu AI của shop.');
    return job;
  }
  async get(userId: string, productId: Types.ObjectId, jobId: Types.ObjectId) {
    return this.publicJob(await this.owned(userId, productId, jobId));
  }
  async review(userId: string, productId: Types.ObjectId, jobId: Types.ObjectId, decision: 'ACCEPT' | 'REJECT') {
    const job = await this.owned(userId, productId, jobId);
    if (job.status !== 'READY') throw new ConflictException('Ảnh AI chưa sẵn sàng hoặc đã bị bỏ.');
    if (decision === 'ACCEPT') {
      const current = await this.source(userId, productId, job.variantId, job.form, job.model);
      if (current.fingerprint !== job.fingerprint) throw new ConflictException('Ảnh hoặc SKU đã đổi. Hãy tạo lại bằng ảnh mới.');
    }
    const changed = await this.jobs.findOneAndUpdate({ _id: jobId, status: 'READY' }, { $set: { reviewedAt: new Date(), ...(decision === 'REJECT' ? { status: 'REJECTED' } : {}) } }, { new: true });
    if (!changed) throw new ConflictException('Ảnh AI vừa được cập nhật. Hãy tải lại.');
    // Only return an approved draft asset. The existing product-save/review flow publishes it.
    return this.publicJob(changed);
  }
  async onModuleInit() {
    if (this.configuration().enabled) await Promise.all([this.jobs.init(), this.quotas.init()]);
    this.timer = setInterval(() => { void this.tick().catch(() => this.logger.error('AI artwork worker could not access the job database.')); }, 1500);
    this.timer.unref();
  }
  onModuleDestroy() { this.stopping = true; if (this.timer) clearInterval(this.timer); }
  async tick() {
    if (this.working || this.stopping || !this.configuration().enabled) return;
    this.working = true;
    try {
      // Never retry a paid request automatically after a timeout or process crash.
      await this.jobs.updateMany({ status: 'RUNNING', startedAt: { $lt: new Date(Date.now() - 12 * 60_000) } }, { $set: { status: 'FAILED', error: 'Lượt AI bị gián đoạn. Không tự gọi lại; vui lòng kiểm tra trước khi tạo lượt mới.' } });
      const job = await this.jobs.findOneAndUpdate({ status: 'QUEUED' }, { $set: { status: 'RUNNING', startedAt: new Date() } }, { new: true, sort: { createdAt: 1 } }).lean();
      if (!job) return;
      try {
        const current = await this.source(job.actorId, job.productId, job.variantId, job.form, job.model);
        if (current.fingerprint !== job.fingerprint) throw new Error('SOURCE_CHANGED');
        const photo = await prepareProductPhoto(await this.storage.readProductImage(job.sourceUrl));
        const guide = await artworkGuide(job.form as ArtworkForm);
        const payload = new FormData();
        payload.append('model', job.model);
        payload.append('image[]', new Blob([new Uint8Array(photo)], { type: 'image/png' }), 'product.png');
        payload.append('image[]', new Blob([new Uint8Array(guide)], { type: 'image/png' }), 'alignment.png');
        payload.append('prompt', artworkPrompt(job.form));
        payload.append('background', 'transparent');
        payload.append('size', '1024x1536');
        payload.append('quality', 'medium');
        payload.append('output_format', 'png');
        payload.append('n', '1');
        if (job.model === 'gpt-image-1.5' || job.model === 'gpt-image-1') payload.append('input_fidelity', 'high');
        const latest = await this.source(job.actorId, job.productId, job.variantId, job.form, job.model);
        if (latest.fingerprint !== job.fingerprint) throw new Error('SOURCE_CHANGED');
        const response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${this.config.get('OPENAI_API_KEY')}` }, body: payload, signal: AbortSignal.timeout(8 * 60_000) });
        if (!response.ok) throw new Error('AI_PROVIDER_FAILED');
        const data = await response.json() as { data?: { b64_json?: string }[] };
        const encoded = data.data?.[0]?.b64_json;
        if (!encoded || encoded.length > 24_000_000) throw new Error('INVALID_AI_RESPONSE');
        const artwork = await normalizeArtwork(Buffer.from(encoded, 'base64'));
        const outputUrl = await this.storage.storeArtwork(String(job._id), artwork);
        await this.jobs.updateOne({ _id: job._id, status: 'RUNNING' }, { $set: { status: 'READY', outputUrl } });
      } catch (e) {
        const message = (e as Error)?.message;
        const error = message === 'SOURCE_CHANGED' ? 'Ảnh hoặc SKU đã thay đổi. Hãy lưu rồi tạo lại.' : /ACCOUNT_NOT_ACTIVE|SHOP_PERMISSION_DENIED/.test(message || '') ? 'Tài khoản hoặc quyền quản lý sản phẩm đã thay đổi. Không gửi ảnh tới AI.' : /INVALID_AI_CANVAS|AI_ARTWORK_REQUIRES_CLEANUP/.test(message || '') ? 'AI trả ảnh chưa đúng khung hoặc chưa xoá sạch nền/mẫu. Ảnh này không được áp dụng.' : 'Không tạo được ảnh AI. Kiểm tra cấu hình/kho ảnh hoặc tạo lượt mới; hệ thống không tự gọi lại.';
        this.logger.warn(`AI artwork job ${job._id} failed; no automatic retry.`);
        await this.jobs.updateOne({ _id: job._id, status: 'RUNNING' }, { $set: { status: 'FAILED', error } });
      }
    } finally { this.working = false; }
  }
}
