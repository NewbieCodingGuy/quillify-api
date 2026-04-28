import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageRecord } from './entities/usage-record.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { User } from '../auth/entities/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageRecord]),
    TypeOrmModule.forFeature([User]),
    AuthModule, // imports JwtModule for JwtGuard
    NotificationModule,
    EmailModule,
  ],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService], // AI module will need this
})
export class UsageModule {}
