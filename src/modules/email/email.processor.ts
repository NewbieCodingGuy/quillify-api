import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { QUEUES, EMAIL_JOBS } from '../../common/constants/queues';
import { Subject } from 'rxjs';

@Processor(QUEUES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      host: configService.get('MAIL_HOST'),
      port: configService.get('MAIL_PORT'),
      auth: {
        user: configService.get('MAIL_USER'),
        pass: configService.get('MAIL_PASS'),
      },
    });
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing email job: ${job.name}`);

    switch (job.name) {
      case EMAIL_JOBS.WELCOME:
        await this.handleWelcome(job.data);
        break;
      case EMAIL_JOBS.USAGE_WARNING:
        await this.handleUsageWarning(job.data);
        break;
      case EMAIL_JOBS.PAYMENT_CONFIRMED:
        await this.handlePaymentConfirmed(job.data);
        break;
      case EMAIL_JOBS.LIMIT_REACHED:
        await this.handleLimitReached(job.data);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleWelcome(data: {
    userId: number;
    name: string;
    email: string;
  }) {
    await this.transporter.sendMail({
      subject: 'Welcome to Quillify',
      from: this.configService.get('MAIL_FROM'),
      to: data.email,
      html: `
        <h2>Welcome, ${data.name}!</h2>
        <p>Your account is ready. You have <strong>10 free AI requests per day</strong>.</p>
        <p>Upgrade to Pro for 100 requests/day.</p>`,
    });
  }

  private async handleUsageWarning(data: {
    userId: number;
    email: string;
    used: number;
    limit: number;
  }) {
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM'),
      to: data.email,
      subject: 'Quillify - Usage Warning',
      html: `
        <h2>You're approaching your daily limit</h2>
        <p>You have used <strong>${data.used} of ${data.limit}</strong> daily AI requests.</p>
        <p>Upgrade to Pro to get ${data.limit * 10} requests per day.</p>
        `,
    });
  }

  private async handlePaymentConfirmed(data: {
    userId: number;
    email: string;
    plan: string;
  }) {
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM'),
      to: data.email,
      subject: 'Welcome to Qulllify Pro!',
      html: `
        <h2>Payment confirmed!</h2>
        <p>You are now on the <strong>Pro plan</strong>.</p>
        <p>Enjoy 100 AI requests per day.</p>
        `,
    });
  }

  private async handleLimitReached(data: {
    userId: number;
    email: string;
    plan: string;
  }) {
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM'),
      to: data.email,
      subject: 'Quillify - Daily Limit Reached',
      html: `
        <h2>You've reached your daily limit</h2>
        <p>Your limit resets at midnight.</p>
        ${
          data.plan === 'free'
            ? '<p><strong>Upgrade to Pro</strong> for 100 requests per day.</p>'
            : '<p>Your limit will reset tomorrow.</p>'
        }
        `,
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Email job ${job.id} (${job.name}) completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Email job ${job.id} (${job.name}) failed: ${error.message}`,
    );
  }
}
