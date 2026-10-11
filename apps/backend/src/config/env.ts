import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(7),
  PICKUP_SECRET: z.string().min(16),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  CAMPUS_TZ: z.string().default('Asia/Kolkata'),
  ALLOWED_EMAIL_DOMAINS: z.string().default(''), // comma list, empty = allow all
  OTP_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('Pocket Canteen <no-reply@example.com>'),
  PAYMENT_GATEWAY: z.enum(['fake', 'razorpay']).default('fake'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_ROUTE_ENABLED: z.enum(['true', 'false']).default('false'),
  PAYMENT_HOLD_MINUTES: z.coerce.number().default(10),
  ML_SERVICE_URL: z.string().optional(),
  ML_TIMEOUT_MS: z.coerce.number().default(50),
});

export const env = schema.parse(process.env);
