import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, ANALYTICS_JOBS } from '../../common/constants/queues';

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectQueue(QUEUES.ANALYTICS) private readonly analyticsQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.analyticsQueue.add(
      ANALYTICS_JOBS.DAILY_REPORT,
      {},
      {
        repeat: {
          pattern: '* * * * *',
        },
        priority: 10,
      },
    );
    this.logger.log('Daily report job scheduled');
  }

  async trackUsage(userId: number, action: string, tokens: number) {
    await this.analyticsQueue.add(
      ANALYTICS_JOBS.TRACK_USAGE,
      { userId, action, tokens, timestamp: new Date().toISOString() },
      {
        priority: 10,
        removeOnComplete: true,
      },
    );
  }
}
