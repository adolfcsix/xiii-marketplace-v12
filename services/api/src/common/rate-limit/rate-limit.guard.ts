import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { createHash } from 'crypto';
import { RATE_LIMIT_KEY, RateLimitOptions, SKIP_RATE_LIMIT_KEY } from './rate-limit.decorator';
import { RedisService } from './redis.service';

const memory = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly config: ConfigService, private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext) {
    if (context.getType() !== 'http') return true;
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    if (skip) return true;
    const specific = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    const limit = specific?.limit || Number(this.config.get('RATE_LIMIT_MAX', 120));
    const windowSeconds = specific?.windowSeconds || Number(this.config.get('RATE_LIMIT_WINDOW_SECONDS', 60));
    const req = context.switchToHttp().getRequest<Request & { user?: { sub?: string } }>();
    const res = context.switchToHttp().getResponse<Response>();
    const raw = req.ip || req.socket?.remoteAddress || 'unknown';
    const identity = req.user?.sub ? `u:${req.user.sub}` : `ip:${raw}`;
    const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
    const route = `${req.method}:${req.route?.path || req.path || 'unknown'}`;
    const fingerprint = createHash('sha1').update(`${identity}|${route}|${bucket}`).digest('hex');
    const key = `xiii:rl:${fingerprint}`;
    let count = 0;
    let ttl = windowSeconds;

    try {
      if (await this.redis.ensureConnected()) {
        count = await this.redis.client!.incr(key);
        if (count === 1) await this.redis.client!.expire(key, windowSeconds);
        ttl = Math.max(1, await this.redis.client!.ttl(key));
      } else throw new Error('redis unavailable');
    } catch {
      const now = Date.now();
      const current = memory.get(key);
      if (!current || current.resetAt <= now) memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      else current.count += 1;
      const entry = memory.get(key)!;
      count = entry.count;
      ttl = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }

    res.setHeader('x-ratelimit-limit', String(limit));
    res.setHeader('x-ratelimit-remaining', String(Math.max(0, limit - count)));
    if (count > limit) {
      res.setHeader('retry-after', String(ttl));
      throw new HttpException({ code: 'RATE_LIMITED', message: `Too many requests. Retry in ${ttl}s.` }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
