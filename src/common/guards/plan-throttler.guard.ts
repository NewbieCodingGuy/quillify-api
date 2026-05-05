import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

const PLAN_RATE_LIMITS = {
  free: { limit: 3, ttl: 60 }, // 3 per minute
  pro: { limit: 10, ttl: 60 }, // 10 per minute
};

@Injectable()
export class PlanThrottlerGuard implements CanActivate {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return true;

    const plan = user.plan || 'free';
    const { limit, ttl } = PLAN_RATE_LIMITS[plan] || PLAN_RATE_LIMITS.free;

    const key = `plan-throttle:${user.userId}:${plan}`;
    const windowKey = `${key}:window`;

    // Get current count
    const current = (await this.cacheManager.get<number>(key)) || 0;

    if (current >= limit) {
      const windowStart = await this.cacheManager.get<number>(windowKey);
      const resetIn = windowStart
        ? Math.max(0, ttl - Math.floor((Date.now() - windowStart) / 1000))
        : ttl;

      throw new HttpException(
        {
          statusCode: 429,
          error: 'Too Many Requests',
          message:
            plan === 'free'
              ? `Free plan: ${limit} AI requests per minute. Upgrade to Pro for ${PLAN_RATE_LIMITS.pro.limit}/minute.`
              : `Pro plan: ${limit} AI requests per minute.`,
          retryAfter: resetIn,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    const newCount = current + 1;
    const ttlMs = ttl * 1000;

    await this.cacheManager.set(key, newCount, ttlMs);

    // Track window start time for accurate retry-after
    if (newCount === 1) {
      await this.cacheManager.set(windowKey, Date.now(), ttlMs);
    }

    return true;
  }
}
