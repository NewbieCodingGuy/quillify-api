import { Injectable } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

export enum NotificationType {
  USAGE_WARNING = 'usage_warning',
  USAGE_LIMIT_REACHED = 'usage_limit_reached',
  PLAN_UPGRADED = 'plan_upgraded',
  PLAN_DOWNGRADED = 'plan_downgraded',
  PAYMENT_FAILED = 'payment_failed',
}

export interface Notification {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  constructor(private readonly gateway: NotificationGateway) {}

  notifyUsageWarning(userId: number, used: number, limit: number) {
    this.gateway.sendToUser(userId, 'notification', {
      type: NotificationType.USAGE_WARNING,
      title: 'Usage Warning',
      message: `You have used ${used} of ${limit} daily AI requests`,
      data: { used, limit, remaining: limit - used },
    });
  }

  notifyLimitReached(userId: number, plan: string) {
    this.gateway.sendToUser(userId, 'notification', {
      type: NotificationType.USAGE_LIMIT_REACHED,
      title: 'Daily Limit Reached',
      message:
        plan === 'free'
          ? 'You have reached your daily limit.Upgrade to Pro for more requests.'
          : 'You have reached your daily limit. Limit resets at midnight.',
      data: { plan },
    });
  }

  notifyPlanUpgraded(userId: number) {
    this.gateway.sendToUser(userId, 'notification', {
      type: NotificationType.PLAN_UPGRADED,
      title: 'Welcome to Pro!',
      message: 'Your plan has been upgraded to Pro. Enjoy unlimited requests!',
    });
  }

  notifyPlanDowngraded(userId: number) {
    this.gateway.sendToUser(userId, 'notification', {
      type: NotificationType.PLAN_DOWNGRADED,
      title: 'Subscription Cancelled',
      message:
        'Your subscription has been cancelled. You are now on the Free plan.',
    });
  }

  notifyPaymentFailed(userId: number) {
    this.gateway.sendToUser(userId, 'notification', {
      type: NotificationType.PAYMENT_FAILED,
      title: 'Payment Failed',
      message: 'Your payment failed. Please update your payment method.',
    });
  }
}
