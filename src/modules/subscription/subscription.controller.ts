import {
  Controller,
  Post,
  Get,
  Headers,
  Body,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('checkout')
  @UseGuards(JwtGuard)
  async createCheckout(@CurrentUser() user: JwtPayload) {
    return this.subscriptionService.createCheckoutSession(
      user.userId,
      user.email,
    );
  }

  @Get('status')
  @UseGuards(JwtGuard)
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.subscriptionService.getStatus(user.userId);
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.subscriptionService.handleWebhook(
      req.rawBody as Buffer,
      signature,
    );
  }
}
