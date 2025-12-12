import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('AfriCom API'),
  APP_VERSION: z.string().default('1.0.0'),
  APP_PORT: z.string().transform(Number).default('3000'),
  APP_HOST: z.string().default('0.0.0.0'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.string().transform(Number).default('10'),
  DATABASE_TIMEOUT: z.string().transform(Number).default('30000'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),
  REDIS_TLS: z.string().transform(v => v === 'true').default('false'),
  CACHE_TTL: z.string().transform(Number).default('3600'),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  API_KEY_PREFIX: z.string().default('ak_live_'),
  API_KEY_LENGTH: z.string().transform(Number).default('32'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Africa Config
  DEFAULT_COUNTRY: z.string().default('GH'),
  DEFAULT_CURRENCY: z.string().default('GHS'),
  DEFAULT_TIMEZONE: z.string().default('Africa/Accra'),
  DEFAULT_LANGUAGE: z.string().default('en'),
  SUPPORTED_COUNTRIES: z.string().default('GH,NG,KE,ZA,UG,TZ,RW,CI,SN,CM'),

  // SMS Providers
  TELECEL_API_KEY: z.string().optional(),
  TELECEL_API_SECRET: z.string().optional(),
  KAIROS_API_KEY: z.string().optional(),
  KAIROS_API_SECRET: z.string().optional(),
  MTN_API_KEY: z.string().optional(),
  MTN_API_SECRET: z.string().optional(),
  VODACOM_API_KEY: z.string().optional(),
  VODACOM_API_SECRET: z.string().optional(),
  AFRICASTALKING_API_KEY: z.string().optional(),
  AFRICASTALKING_USERNAME: z.string().optional(),

  // Voice Providers
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Email
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().transform(Number).default('587'),
  SMTP_SECURE: z.string().transform(v => v === 'true').default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_NAME: z.string().default('AfriCom'),
  SMTP_FROM_EMAIL: z.string().email().default('noreply@africom.com'),

  // WhatsApp
  WHATSAPP_BUSINESS_API_KEY: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),

  // Push Notifications
  FCM_SERVER_KEY: z.string().optional(),
  FCM_PROJECT_ID: z.string().optional(),

  // Payment Providers
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),

  // Storage
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_BUCKET: z.string().optional(),

  // Webhooks
  WEBHOOK_SECRET: z.string().optional(),
  WEBHOOK_TIMEOUT: z.string().transform(Number).default('10000'),
  WEBHOOK_MAX_RETRIES: z.string().transform(Number).default('3'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z.string().transform(v => v === 'true').default('true'),
  CORS_METHODS: z.string().default('GET,POST,PUT,PATCH,DELETE,OPTIONS'),

  // Features
  ENABLE_API_DOCS: z.string().transform(v => v === 'true').default('true'),
  ENABLE_WEBHOOKS: z.string().transform(v => v === 'true').default('true'),
  ENABLE_RATE_LIMITING: z.string().transform(v => v === 'true').default('true'),
  ENABLE_CACHING: z.string().transform(v => v === 'true').default('true'),
  ENABLE_QUEUE: z.string().transform(v => v === 'true').default('true'),

  // Billing
  DEFAULT_CREDIT_RATE: z.string().transform(Number).default('1.0'),
  LOW_BALANCE_THRESHOLD: z.string().transform(Number).default('10.0'),
  MIN_TOPUP_AMOUNT: z.string().transform(Number).default('10.0'),

  // Pricing
  SMS_RATE_GHANA: z.string().transform(Number).default('0.05'),
  SMS_RATE_NIGERIA: z.string().transform(Number).default('0.06'),
  SMS_RATE_KENYA: z.string().transform(Number).default('0.05'),
  EMAIL_RATE: z.string().transform(Number).default('0.02'),
  VOICE_RATE_PER_MINUTE: z.string().transform(Number).default('0.20'),
  WHATSAPP_RATE: z.string().transform(Number).default('0.08'),
  PUSH_RATE: z.string().transform(Number).default('0.01'),
  LOOKUP_RATE: z.string().transform(Number).default('0.03'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(`❌ Invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

export const env = validateEnv();

export default env;