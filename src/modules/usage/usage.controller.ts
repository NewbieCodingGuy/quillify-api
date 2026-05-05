import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { UserPlan } from '../auth/entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Controller('usage')
@UseGuards(JwtGuard)
@UseInterceptors(CacheInterceptor)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @CacheTTL(30000)
  @CacheKey('usage')
  async getUsage(@CurrentUser() user: JwtPayload) {
    return this.usageService.getUsage(user.userId, user.plan as UserPlan);
  }

  @Get('history')
  async getHistory(@CurrentUser() user: JwtPayload) {
    return this.usageService.getUsageHistory(user.userId);
  }
}
