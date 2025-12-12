// src/core/config/email.config.ts

export const emailConfig = {
  // SMTP Configuration (Outbound)
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
    
    // Inbound SMTP server port
    inboundPort: parseInt(process.env.SMTP_INBOUND_PORT || '2525'),
    
    // Pool configuration
    pool: {
      maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || '10'),
      maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES || '100'),
      rateDelta: parseInt(process.env.SMTP_RATE_DELTA || '1000'),
      rateLimit: parseInt(process.env.SMTP_RATE_LIMIT || '10'),
    },
  },

  // Email Defaults
  defaults: {
    from: {
      name: process.env.EMAIL_FROM_NAME || 'AfriCom',
      email: process.env.EMAIL_FROM_ADDRESS || 'noreply@africommunications.io',
    },
    replyTo: process.env.EMAIL_REPLY_TO || 'support@africommunications.io',
  },

  // Domain Configuration
  domain: {
    default: process.env.EMAIL_DOMAIN || 'africommunications.io',
    dkimSelector: process.env.DKIM_SELECTOR || 'africom',
  },

  // Email Limits
  limits: {
    maxRecipientsPerEmail: parseInt(process.env.EMAIL_MAX_RECIPIENTS || '50'),
    maxAttachmentSize: parseInt(process.env.EMAIL_MAX_ATTACHMENT_SIZE || '10485760'), // 10MB
    maxTotalAttachmentSize: parseInt(process.env.EMAIL_MAX_TOTAL_ATTACHMENT_SIZE || '25165824'), // 24MB
    maxEmailSize: parseInt(process.env.EMAIL_MAX_SIZE || '26214400'), // 25MB
    dailyLimit: parseInt(process.env.EMAIL_DAILY_LIMIT || '10000'),
    monthlyLimit: parseInt(process.env.EMAIL_MONTHLY_LIMIT || '300000'),
  },

  // Pricing
  pricing: {
    costPerEmail: parseFloat(process.env.EMAIL_COST_PER_EMAIL || '0.01'), // $0.01 per email
    currency: process.env.PRICING_CURRENCY || 'GHS',
  },

  // Features
  features: {
    enableReactEmail: process.env.ENABLE_REACT_EMAIL !== 'false',
    enableTracking: process.env.ENABLE_EMAIL_TRACKING !== 'false',
    enableSmtpServer: process.env.ENABLE_SMTP_SERVER !== 'false',
    enableWebhooks: process.env.ENABLE_EMAIL_WEBHOOKS !== 'false',
  },

  // Tracking
  tracking: {
    trackOpens: process.env.EMAIL_TRACK_OPENS !== 'false',
    trackClicks: process.env.EMAIL_TRACK_CLICKS !== 'false',
    trackingDomain: process.env.EMAIL_TRACKING_DOMAIN || 'track.africommunications.io',
  },

  // Bounce Handling
  bounce: {
    maxHardBounces: parseInt(process.env.EMAIL_MAX_HARD_BOUNCES || '5'),
    maxSoftBounces: parseInt(process.env.EMAIL_MAX_SOFT_BOUNCES || '10'),
    bounceThresholdDays: parseInt(process.env.EMAIL_BOUNCE_THRESHOLD_DAYS || '30'),
  },

  // Queue Configuration
  queue: {
    concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '10'),
    retryAttempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '60000'), // 1 minute
    maxRetryDelay: parseInt(process.env.EMAIL_MAX_RETRY_DELAY || '3600000'), // 1 hour
  },

  // Template Configuration
  templates: {
    defaultLanguage: process.env.EMAIL_TEMPLATE_DEFAULT_LANGUAGE || 'en',
    allowCustomTemplates: process.env.EMAIL_ALLOW_CUSTOM_TEMPLATES !== 'false',
  },

  // Security
  security: {
    requireDKIM: process.env.EMAIL_REQUIRE_DKIM === 'true',
    requireSPF: process.env.EMAIL_REQUIRE_SPF === 'true',
    requireDMARC: process.env.EMAIL_REQUIRE_DMARC === 'true',
    blockDisposableEmails: process.env.EMAIL_BLOCK_DISPOSABLE === 'true',
    maxFailedAttempts: parseInt(process.env.EMAIL_MAX_FAILED_ATTEMPTS || '5'),
  },

  // Compliance
  compliance: {
    requireUnsubscribeLink: process.env.EMAIL_REQUIRE_UNSUBSCRIBE !== 'false',
    unsubscribeUrl: process.env.EMAIL_UNSUBSCRIBE_URL || 'https://africommunications.io/unsubscribe',
    physicalAddress: process.env.EMAIL_PHYSICAL_ADDRESS || '',
  },
};