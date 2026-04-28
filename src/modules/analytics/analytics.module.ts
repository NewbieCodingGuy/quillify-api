import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '../../common/constants/queues';
import { AnalyticsProcessor } from './analytics.processor';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.ANALYTICS,
    }),
  ],
  providers: [AnalyticsProcessor, AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
