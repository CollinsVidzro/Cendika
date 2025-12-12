// Authentication middleware
export {
  apiKeyAuth,
  jwtAuth,
  optionalAuth,
  requirePermissions,
  requireAccountType,
} from './auth.middleware';

// Rate limiting middleware
export {
  rateLimit,
  apiKeyRateLimit,
  smsRateLimit,
  emailRateLimit,
  voiceRateLimit,
  lookupRateLimit,
} from './rate-limit.middleware';

// Validation middleware
export {
  validate,
  commonSchemas,
  validatePhoneNumber,
  validateEmail,
  validateEmails,
  validateAmount,
  validateSenderId,
  sanitizeEmailContent,
  validateBulkRequest,
  validateAttachment,
} from './validation.middleware';

// Billing middleware
export {
  checkBalance,
  deductBalance,
  checkLimits,
} from './billing.middleware';

// Logging middleware
export {
  requestLogger,
  usageLogger,
  auditLogger,
  errorLogger,
  logSMSDelivery,
  logEmailDelivery,
  logVoiceCall,
  logPayment,
  logWebhook,
} from './logging.middleware';

// Geolocation middleware
export {
  geoLocation,
  requireAfricanRegion,
  countryRouter,
  detectNetwork,
} from './geo.middleware';