import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageType } from './dto/usage.type';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/common/decorators/current-user.decorator';
import { UserPlan } from '../auth/entities/user.entity';

@Resolver()
export class UsageResolver {
  constructor(private readonly usageService: UsageService) {}

  @Query(() => UsageType)
  @UseGuards(GqlAuthGuard)
  async myUsage(@CurrentUser() user: JwtPayload) {
    return this.usageService.getUsage(user.userId, user.plan as UserPlan);
  }
}
