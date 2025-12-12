import type { Context } from 'hono';
import type { Account, ApiKey, User, Session } from '../../../generated/prisma/client';

// Context extension types
declare module 'hono' {
  interface ContextVariableMap {
    // Authentication
    apiKey: ApiKeyWithAccount;
    account: Account;
    accountId: string;
    user: User;
    userId: string;
    session: Session;
    
    // Geolocation
    country: string;
    city: string;
    region: string;
    timezone: string;
    preferredProvider: string;
    pricingTier: string;
    
    // Billing
    estimatedCost: number;
    costCurrency: string;
    actualCost: number;
    serviceType: ServiceType;
    
    // Request tracking
    requestId: string;
  }
}

// Add to existing types.ts file
export interface TokenPayload {
  keyId: string;
  accountId: string;
  iat: number;
  exp: number;
  scope?: string[];
}

export interface TokenRequest {
  key: string;
  secret: string;
}

export interface TokenResponse {
  token: string;
  expiresAt: Date;
  tokenType: 'Bearer';
  scope?: string[];
}

// Extended types for Prisma models
export interface ApiKeyWithAccount extends ApiKey {
  account: Account;
}

export interface AccountWithLimits extends Account {
  limits?: AccountLimits;
}

// Service types
export type ServiceType = 
  | 'sms' 
  | 'email' 
  | 'voice' 
  | 'whatsapp' 
  | 'push' 
  | 'lookup' 
  | 'chat'
  | 'otp';

// Rate limiting types
export interface RateLimitStoreEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (c: Context) => string;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

// Validation types
export interface ValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PhoneValidationResult {
  valid: boolean;
  formatted?: string;
  country?: string;
  error?: string;
}

export interface EmailValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
  suggestions?: string[];
}

export interface BulkValidationResult {
  valid: boolean;
  validItems: any[];
  invalidItems: Array<{
    item: any;
    error: string;
  }>;
}

// Billing types
export interface CostEstimate {
  estimatedCost: number;
  currency: string;
  units?: number;
}

export interface TransactionData {
  accountId: string;
  amount: number;
  serviceType: ServiceType;
  description: string;
  metadata?: Record<string, any>;
}

// Geolocation types
export interface GeoLocationData {
  country: string;
  city: string;
  region: string;
  timezone: string;
  ip?: string;
}

export interface NetworkDetectionResult {
  country: string | null;
  network: string | null;
  operator: string | null;
}

// Logging types
export interface LogEntry {
  type: string;
  timestamp: Date;
  data: Record<string, any>;
}

export interface AuditLogData {
  action: string;
  entity: string;
  entityId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  changes?: Record<string, any>;
}

// Account limits from database (matching Prisma schema)
export interface AccountLimits {
  id: string;
  accountId: string;
  dailySmsLimit?: number;
  monthlySmsLimit?: number;
  dailySmsSent: number;
  monthlySmsSent: number;
  dailySpendLimit?: number;
  monthlySpendLimit?: number;
  dailySpent: number;
  monthlySpent: number;
  maxContacts?: number;
  currentContacts: number;
  maxTeamMembers?: number;
  currentTeamMembers: number;
  apiRateLimit: number;
  apiRequestsToday: number;
  apiRequestsThisMonth: number;
  maxCampaigns?: number;
  currentCampaigns: number;
  maxTemplates?: number;
  currentTemplates: number;
  maxSenderIds?: number;
  currentSenderIds: number;
  maxApiKeys?: number;
  currentApiKeys: number;
  maxWebhooks?: number;
  currentWebhooks: number;
  lastDailyReset?: Date;
  lastMonthlyReset?: Date;
  createdAt: Date;
  updatedAt: Date;
}