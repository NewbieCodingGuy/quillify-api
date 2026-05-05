import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { ChatSession } from './entities/chat.entity';
import { AuthModule } from '../auth/auth.module';
import { UsageModule } from '../usage/usage.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AiClientModule } from './ai-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession]),
    AuthModule,
    UsageModule,
    AnalyticsModule,
    AiClientModule,
  ],
  controllers: [AiController],
  providers: [],
  exports: [],
})
export class AiModule {}
