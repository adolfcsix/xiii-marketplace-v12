import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis | null;
  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    this.client = url ? new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false }) : null;
    this.client?.on('error', () => undefined);
  }
  async ensureConnected() {
    if (!this.client) return false;
    if (this.client.status === 'wait') await this.client.connect();
    return this.client.status === 'ready';
  }
  async ping() {
    if (!(await this.ensureConnected())) return false;
    return (await this.client!.ping()) === 'PONG';
  }
  async onModuleDestroy() {
    try { if (this.client && this.client.status !== 'end') await this.client.quit(); } catch { this.client?.disconnect(); }
  }
}
