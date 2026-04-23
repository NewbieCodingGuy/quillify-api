import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageRecord } from './entities/usage-record.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageRecord]),
    AuthModule, // imports JwtModule for JwtGuard
  ],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService], // AI module will need this
})
export class UsageModule {}
