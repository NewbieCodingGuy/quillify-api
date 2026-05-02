import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { UsageService } from '../usage/usage.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  GenerateDto,
  ImproveDto,
  SummarizeDto,
  ChatDto,
} from './dto/generate.dto';
import { UserPlan } from '../auth/entities/user.entity';
import { AnalyticsService } from '../analytics/analytics.service';
import { PlanThrottlerGuard } from '../../common/guards/plan-throttler.guard';

@Controller('ai')
@UseGuards(JwtGuard, PlanThrottlerGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly usageService: UsageService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post('generate')
  async generate(@Body() dto: GenerateDto, @CurrentUser() user: JwtPayload) {
    await this.usageService.checkAndIncrement(
      user.userId,
      user.plan as UserPlan,
    );
    const result = this.aiService.generateText(dto, user.userId);

    await this.analyticsService.trackUsage(
      user.userId,
      'GENERATE',
      (await result).usage.totalTokens || 0,
    );

    return result;
  }

  @Post('improve')
  async improve(@Body() dto: ImproveDto, @CurrentUser() user: JwtPayload) {
    await this.usageService.checkAndIncrement(
      user.userId,
      user.plan as UserPlan,
    );
    return this.aiService.improveText(dto, user.userId);
  }

  @Post('summarize')
  async summarize(@Body() dto: SummarizeDto, @CurrentUser() user: JwtPayload) {
    await this.usageService.checkAndIncrement(
      user.userId,
      user.plan as UserPlan,
    );
    return this.aiService.summarizeText(dto, user.userId);
  }

  @Post('chat')
  async chat(@Body() dto: ChatDto, @CurrentUser() user: JwtPayload) {
    await this.usageService.checkAndIncrement(
      user.userId,
      user.plan as UserPlan,
    );
    return this.aiService.chat(dto, user.userId);
  }

  @Get('chat/sessions')
  async getSessions(@CurrentUser() user: JwtPayload) {
    return this.aiService.getUserSessions(user.userId);
  }

  @Get('chat/:sessionId')
  async getChatHistory(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.aiService.getChatHistory(sessionId, user.userId);
  }
}
