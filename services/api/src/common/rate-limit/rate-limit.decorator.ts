import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'xiii:rate-limit';
export const SKIP_RATE_LIMIT_KEY = 'xiii:skip-rate-limit';
export type RateLimitOptions = { limit: number; windowSeconds: number };
export const RateLimit = (limit: number, windowSeconds: number) => SetMetadata(RATE_LIMIT_KEY, { limit, windowSeconds } satisfies RateLimitOptions);
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
