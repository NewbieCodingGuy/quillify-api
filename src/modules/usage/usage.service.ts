import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageRecord } from './entities/usage-record.entity';
import { UserPlan } from '../auth/entities/user.entity';

const PLAN_LIMITS = {
  [UserPlan.FREE]: 10,
  [UserPlan.PRO]: 100,
};

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageRecord)
    private readonly usageRepository: Repository<UsageRecord>,
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
  }

  async getUsage(userId: number, plan: UserPlan) {
    const today = this.getToday();
    const limit = PLAN_LIMITS[plan];

    const record = await this.usageRepository.findOne({
      where: { userId, date: today },
    });

    return {
      used: record?.requestCount ?? 0,
      limit,
      remaining: Math.max(0, limit - (record?.requestCount ?? 0)),
      resetAt: `${today}T23:59:59.000Z`,
      plan,
    };
  }

  async getUsageHistory(userId: number) {
    return this.usageRepository.find({
      where: { userId },
      order: { date: 'DESC' },
      take: 30, // last 30 days
    });
  }
}
