import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './notification.schema';
import { ListNotificationsDto } from './notifications.dto';
import { RealtimePublisher } from './realtime-publisher.service';

type CreateNotificationInput = {
  userId: string | Types.ObjectId;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notifications: Model<Notification>,
    private readonly realtime: RealtimePublisher,
  ) {}

  private oid(value: string | Types.ObjectId) { return value instanceof Types.ObjectId ? value : new Types.ObjectId(value); }

  async create(input: CreateNotificationInput) {
    const row = await this.notifications.create({
      userId: this.oid(input.userId), type: input.type, title: input.title.trim(), body: input.body.trim(), data: input.data || {}, readAt: null,
    });
    const payload = this.serialize(row.toObject());
    this.realtime.emitUser(row.userId.toString(), 'notification:new', payload);
    return payload;
  }

  async createSafe(input: CreateNotificationInput) { try { return await this.create(input); } catch { return null; } }

  async createMany(inputs: CreateNotificationInput[]) {
    const output: any[] = [];
    for (const input of inputs) output.push(await this.create(input));
    return output;
  }

  async list(userId: string, dto: ListNotificationsDto) {
    const page = dto.page || 1; const limit = dto.limit || 30;
    const filter: Record<string, unknown> = { userId: this.oid(userId) };
    if (dto.unreadOnly) filter.readAt = null;
    const [rows, total, unreadCount] = await Promise.all([
      this.notifications.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<any[]>(),
      this.notifications.countDocuments(filter),
      this.notifications.countDocuments({ userId: this.oid(userId), readAt: null }),
    ]);
    return { items: rows.map(row => this.serialize(row)), unreadCount, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async unreadCount(userId: string) { return { unreadCount: await this.notifications.countDocuments({ userId: this.oid(userId), readAt: null }) }; }

  async markRead(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    const row = await this.notifications.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: this.oid(userId) }, { $set: { readAt: new Date() } }, { new: true },
    ).lean<any>();
    if (!row) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    const unreadCount = await this.notifications.countDocuments({ userId: this.oid(userId), readAt: null });
    this.realtime.emitUser(userId, 'notification:count', { unreadCount });
    return this.serialize(row);
  }

  async markAllRead(userId: string) {
    const result = await this.notifications.updateMany({ userId: this.oid(userId), readAt: null }, { $set: { readAt: new Date() } });
    this.realtime.emitUser(userId, 'notification:count', { unreadCount: 0 });
    return { modifiedCount: result.modifiedCount, unreadCount: 0 };
  }

  private serialize(row: any) {
    return { ...row, _id: row._id.toString(), userId: row.userId.toString() };
  }
}
