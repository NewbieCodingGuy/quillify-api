import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, EMAIL_JOBS } from '../../common/constants/queues';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue(QUEUES.EMAIL)
    private readonly emailQueue: Queue,
  ) {}

  async sendWelcomeEmail(userId: number, name: string, email: string) {
    await this.emailQueue.add(
      EMAIL_JOBS.WELCOME,
      { userId, name, email },
      {
        priority: 1,
        delay: 0,
      },
    );
    this.logger.log(`Welcome email queued for ${email}`);
  }

  async sendUsageWarningEmail(
    userId: number,
    email: string,
    used: number,
    limit: number,
  ) {
    await this.emailQueue.add(
      EMAIL_JOBS.USAGE_WARNING,
      { userId, email, used, limit },
      {
        priority: 5,
        jobId: `usage-warning:${userId}:${new Date().toISOString().split('T')[0]}`,
      },
    );
  }

  async sendPaymentConfirmedEmail(userId: number, email: string, plan: string) {
    await this.emailQueue.add(
      EMAIL_JOBS.PAYMENT_CONFIRMED,
      { userId, email, plan },
      { priority: 1 },
    );
  }

  async sendLimitReachedEmail(userId: number, email: string, plan: string) {
    await this.emailQueue.add(
      EMAIL_JOBS.LIMIT_REACHED,
      { userId, email, plan },
      {
        priority: 3,
        jobId: `limit-reached:${userId}:${new Date().toISOString().split('T')[0]}`,
      },
    );
  }
}
