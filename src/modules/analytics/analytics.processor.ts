import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, ANALYTICS_JOBS } from '../../common/constants/queues';

@Processor(QUEUES.ANALYTICS)
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case ANALYTICS_JOBS.TRACK_USAGE:
        await this.trackUsage(job.data);
        break;
      case ANALYTICS_JOBS.DAILY_REPORT:
        await this.generateDailyReport();
        break;
    }
  }

  private async trackUsage(data: {
    userId: number;
    action: string;
    tokens: number;
    timestamp: string;
  }) {
    this.logger.log(
      `Usage tracked: user=${data.userId} action=${data.action} tokens=${data.tokens}`,
    );
  }

  private async generateDailyReport() {
    this.logger.log(`Daily report generated: ${new Date().toISOString()}`);
  }
}
