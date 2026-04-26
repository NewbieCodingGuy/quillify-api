import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { User, UserPlan } from '../auth/entities/user.entity';

@Injectable()
export class SubscriptionService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get('STRIPE_SECRET_KEY') as string,
    );
  }

  async createCheckoutSession(userId: number, email: string) {
    // Get or create Stripe customer
    let subscription = await this.subscriptionRepository.findOne({
      where: { userId },
    });

    let customerId: string;

    if (subscription?.stripeCustomerId) {
      customerId = subscription.stripeCustomerId;
    } else {
      // Create new Stripe customer
      const customer = await this.stripe.customers.create({ email });
      customerId = customer.id;

      // Store subscription record
      subscription = this.subscriptionRepository.create({
        userId,
        stripeCustomerId: customerId,
      });
      await this.subscriptionRepository.save(subscription);
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: this.configService.get('STRIPE_PRO_PRICE_ID'),
          quantity: 1,
        },
      ],
      success_url: `${this.configService.get('APP_URL')}/subscription/success`,
      cancel_url: `${this.configService.get('APP_URL')}/subscription/cancel`,
      metadata: { userId: userId.toString() },
    });

    return { checkoutUrl: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get('STRIPE_WEBHOOK_SECRET') as string,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${event.type}`);
    }

    return { received: true };
  }

  async getStatus(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
    });

    return {
      plan: user?.plan,
      status: subscription?.status || 'none',
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
    };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = parseInt(session.metadata?.userId || '0');
    if (!userId) return;

    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    // Update subscription record
    await this.subscriptionRepository.update(
      { userId },
      {
        stripeSubscriptionId: stripeSubscription.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000,
        ),
      },
    );

    // Upgrade user plan
    await this.userRepository.update({ id: userId }, { plan: UserPlan.PRO });

    this.logger.log(`User ${userId} upgraded to Pro`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const sub = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!sub) return;

    await this.subscriptionRepository.update(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status as SubscriptionStatus,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const sub = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!sub) return;

    // Downgrade user to free
    await this.userRepository.update(
      { id: sub.userId },
      { plan: UserPlan.FREE },
    );

    await this.subscriptionRepository.update(
      { stripeSubscriptionId: subscription.id },
      { status: SubscriptionStatus.CANCELLED },
    );

    this.logger.log(`User ${sub.userId} downgraded to Free`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const sub = await this.subscriptionRepository.findOne({
      where: { stripeCustomerId: invoice.customer as string },
    });
    if (!sub) return;

    await this.subscriptionRepository.update(
      { userId: sub.userId },
      { status: SubscriptionStatus.PAST_DUE },
    );

    this.logger.warn(`Payment failed for user ${sub.userId}`);
  }
}
