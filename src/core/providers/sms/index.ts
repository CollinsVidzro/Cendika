// Export all SMS provider components

// Base provider
export { BaseSMSProvider } from './base-sms.provider';
export type {
  SMSProviderConfig,
  SendSMSOptions,
  ProviderResponse,
  DeliveryStatus,
  ProviderBalance,
  ProviderStats,
} from './base-sms.provider';

// Provider implementations
export { KairosProvider } from './kairos.provider';
export { AfricasTalkingProvider } from './africastalking.provider';
export { MTNProvider } from './mtn.provider';
export { TwilioProvider } from './twilio.provider';

// Provider factory and router
export { SMSProviderFactory } from './provider.factory';
export { SMSProviderRouter } from './provider.router';

// Initialize providers on import
import { SMSProviderFactory } from './provider.factory';

// Auto-initialize providers
SMSProviderFactory.initializeProviders().catch(error => {
  console.error('Failed to initialize SMS providers:', error);
});