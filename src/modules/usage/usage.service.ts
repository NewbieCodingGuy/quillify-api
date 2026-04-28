import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageRecord } from './entities/usage-record.entity';
import { UserPlan } from '../auth/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { User } from '../auth/entities/user.entity';
import { EmailService } from '../email/email.service';

const PLAN_LIMITS = {
  [UserPlan.FREE]: 10,
  [UserPlan.PRO]: 100,
};

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageRecord)
    private readonly usageRepository: Repository<UsageRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly emailService: EmailService,
  ) {}

  private getToday(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  async checkAndIncrement(userId: number, plan: UserPlan): Promise<void> {
    const today = this.getToday();
    const limit = PLAN_LIMITS[plan];

    // Get or create today's record
    let record = await this.usageRepository.findOne({
      where: { userId, date: today },
    });

    if (!record) {
      record = this.usageRepository.create({
        userId,
        date: today,
        requestCount: 0,
      });
    }

    // Check limit before incrementing
    if (record.requestCount >= limit) {
      //Notify limit reached
      this.notificationService.notifyLimitReached(userId, plan);
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.emailService.sendLimitReachedEmail(userId, user.email, plan);
      }
      throw new ForbiddenException(
        `Daily limit reached. ${
          plan === UserPlan.FREE
            ? 'Upgrade to Pro for more requests.'
            : `You have used all ${limit} daily requests.`
        }`,
      );
    }

    // Increment
    record.requestCount += 1;
    await this.usageRepository.save(record);

    const usagePercent = (record.requestCount / limit) * 100;
    if (usagePercent >= 80 && usagePercent < 100) {
      this.notificationService.notifyUsageWarning(
        userId,
        record.requestCount,
        limit,
      );

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.emailService.sendUsageWarningEmail(
          userId,
          user.email,
          record.requestCount,
          limit,
        );
      }
    }

    //Invalidate usage cache after increment
    await this.cacheManager.del(`usage:${userId}:${this.getToday()}`);
  }

  async getUsage(userId: number, plan: UserPlan) {
    const cacheKey = `usage:${userId}:${this.getToday()}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const today = this.getToday();
    const limit = PLAN_LIMITS[plan];

    const record = await this.usageRepository.findOne({
      where: { userId, date: today },
    });

    const result = {
      used: record?.requestCount ?? 0,
      limit,
      remaining: Math.max(0, limit - (record?.requestCount ?? 0)),
      resetAt: `${today}T23:59:59.000Z`,
      plan,
    };

    await this.cacheManager.set(cacheKey, result, 30000);
    return result;
  }

  async getUsageHistory(userId: number) {
    return this.usageRepository.find({
      where: { userId },
      order: { date: 'DESC' },
      take: 30, // last 30 days
    });
  }
}
