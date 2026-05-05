import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { UsageService } from '../usage/usage.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PlanThrottlerGuard } from '../../common/guards/plan-throttler.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  GenerateDto,
  ImproveDto,
  SummarizeDto,
  ChatDto,
} from './dto/generate.dto';
import { UserPlan } from '../auth/entities/user.entity';
import { AI_SERVICE } from './ai-client.module';

@Controller('ai')
@UseGuards(JwtGuard, PlanThrottlerGuard)
export class AiController {
  constructor(
    @Inject(AI_SERVICE) private readonly aiClient: ClientProxy,
    private readonly usageService: UsageService,
  ) {}

  @Post('generate')
  async generate(@Body() dto: GenerateDto, @CurrentUser() user: JwtPayload) {
    await this.usageService.checkAndIncrement(
      user.userId,
      user.plan as UserPlan,
    );

    // Send to AI microservice
    const result = await firstValueFrom(
      this.aiClient.send('ai.generate', { dto, userId: user.userId }),
    );

    // After successful AI response
    this.aiClient.emit('ai.completed', {
      userId: user.userId,
      action: 'generate',
      tokens: result.usage?.totalTokens,
    });
    // emit() is fire-and-forget — doesn't wait for response

    return result;
  }

  @Post('improve')
  async improve(@Body() dto: ImproveDto, @CurrentUser() user: JwtPayload) {
    await this.usageService.checkAndIncrement(
      user.userId,
      user.plan as UserPlan,
    );

    const result = await firstValueFrom(
      this.aiClient.send('ai.improve', { dto, userId: user.userId }),
    );

    // After successful AI response
    this.aiClient.emit('ai.completed', {
      userId: user.userId,
      action: 'generate',
      tokens: result.usage?.totalTokens,
    });
    // emit() is fire-and-forget — doesn't wait for response

    return result;
  }

  @Post('summarize')
  async summarize(@Body() dto: SummarizeDto, @CurrentUser() user: JwtPayload) {
    await this.usageService.checkAndIncrement(
      user.userId,
      user.plan as UserPlan,
    );

    const result = await firstValueFrom(
      this.aiClient.send('ai.summarize', { dto, userId: user.userId }),
    );

    // After successful AI response
    this.aiClient.emit('ai.completed', {
      userId: user.userId,
      action: 'generate',
      tokens: result.usage?.totalTokens,
    });
    // emit() is fire-and-forget — doesn't wait for response

    return result;
  }

  @Post('chat')
  async chat(@Body() dto: ChatDto, @CurrentUser() user: JwtPayload) {
    await this.usageService.checkAndIncrement(
      user.userId,
      user.plan as UserPlan,
    );

    const result = await firstValueFrom(
      this.aiClient.send('ai.chat', { dto, userId: user.userId }),
    );

    // After successful AI response
    this.aiClient.emit('ai.completed', {
      userId: user.userId,
      action: 'generate',
      tokens: result.usage?.totalTokens,
    });
    // emit() is fire-and-forget — doesn't wait for response

    return result;
  }

  @Get('chat/sessions')
  async getSessions(@CurrentUser() user: JwtPayload) {
    return firstValueFrom(
      this.aiClient.send('ai.sessions', { userId: user.userId }),
    );
  }

  @Get('chat/:sessionId')
  async getChatHistory(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.aiClient.send('ai.chat.history', { sessionId, userId: user.userId }),
    );
  }
}
