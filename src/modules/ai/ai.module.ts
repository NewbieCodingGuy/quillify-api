import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ChatSession } from './entities/chat.entity';
import { AuthModule } from '../auth/auth.module';
import { UsageModule } from '../usage/usage.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession]),
    AuthModule,
    UsageModule,
    AnalyticsModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
