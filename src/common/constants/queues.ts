export const QUEUES = {
  EMAIL: 'email',
  AI: 'ai',
  ANALYTICS: 'analytics',
} as const;

export const EMAIL_JOBS = {
  WELCOME: 'welcome',
  USAGE_WARNING: 'usage-warning',
  PAYMENT_CONFIRMED: 'payment-confirmed',
  LIMIT_REACHED: 'limit-reached',
} as const;

export const AI_JOBS = {
  SUMMARIZE_DOCUMENT: 'summarize-document',
  BATCH_IMPROVE: 'batch-improve',
} as const;

export const ANALYTICS_JOBS = {
  TRACK_USAGE: 'track-usage',
  DAILY_REPORT: 'daily-report',
} as const;
