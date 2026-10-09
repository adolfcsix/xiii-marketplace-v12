import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SkipRateLimit } from './common/rate-limit/rate-limit.decorator';
import { RedisService } from './common/rate-limit/redis.service';

@Controller('health')
@SkipRateLimit()
export class HealthController {
  constructor(@InjectConnection() private readonly mongo: Connection, private readonly redis: RedisService) {}

  @Get('live')
  live() {
    return { service: 'xiii-api', status: 'ok', release: process.env.APP_RELEASE || 'dev', uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    const mongo = this.mongo.readyState === 1;
    let redis = false;
    try { redis = await this.redis.ping(); } catch { redis = false; }
    const requireRedis = String(process.env.REQUIRE_REDIS || 'true') === 'true';
    const ready = mongo && (!requireRedis || redis);
    const body = { service: 'xiii-api', status: ready ? 'ready' : 'not_ready', release: process.env.APP_RELEASE || 'dev', dependencies: { mongo, redis }, timestamp: new Date().toISOString() };
    if (!ready) throw new ServiceUnavailableException({ code: 'SERVICE_NOT_READY', message: 'Required dependencies are not ready.', details: body.dependencies });
    return body;
  }

  @Get()
  health() { return this.live(); }
}
