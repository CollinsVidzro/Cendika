import { logger } from '@utils/logger';

// Provider configuration
export interface SMSProviderConfig {
  name: string;
  type: 'SMS';
  credentials: Record<string, any>;
  config?: Record<string, any>;
  supportedCountries: string[];
  supportedNetworks?: string[];
  priority?: number;
  maxRetries?: number;
  timeout?: number;
}

// Send SMS options
export interface SendSMSOptions {
  recipient: string;
  message: string;
  senderId: string;
  messageId?: string;
  metadata?: Record<string, any>;
}

// Provider response
export interface ProviderResponse {
  success: boolean;
  status: 'submitted' | 'sent' | 'delivered' | 'failed' | 'rejected' | 'invalid_parameters' | 'authentication_error' | 'insufficient_credit' | 'provider_error';
  externalId?: string;
  message?: string;
  errorCode?: string;
  providerId: string;
  cost?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

// Delivery status
export interface DeliveryStatus {
  status: 'sent' | 'delivered' | 'failed' | 'pending' | 'unknown';
  timestamp?: Date;
  externalId: string;
  error?: string;
  metadata?: Record<string, any>;
}

// Provider balance
export interface ProviderBalance {
  balance: number;
  currency: string;
  error?: string;
}

// Provider statistics
export interface ProviderStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  successRate: number;
  avgLatency: number;
  lastUsed?: Date;
}

/**
 * Base SMS Provider
 * All SMS providers must extend this class
 */
export abstract class BaseSMSProvider {
  protected config: SMSProviderConfig;
  protected stats: ProviderStats;

  constructor(config: SMSProviderConfig) {
    this.config = config;
    this.stats = {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      successRate: 0,
      avgLatency: 0,
    };

    logger.info({
      provider: config.name,
      countries: config.supportedCountries,
    }, 'SMS provider initialized');
  }

  // Abstract methods that must be implemented by subclasses
  abstract sendSMS(options: SendSMSOptions): Promise<ProviderResponse>;
  abstract getDeliveryStatus(externalId: string): Promise<DeliveryStatus>;
  abstract checkBalance(): Promise<ProviderBalance>;

  /**
   * Get provider ID
   */
  getProviderId(): string {
    return this.config.name.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.config.name;
  }

  /**
   * Check if provider supports country
   */
  supportsCountry(countryCode: string): boolean {
    return this.config.supportedCountries.includes(countryCode);
  }

  /**
   * Check if provider supports network
   */
  supportsNetwork(network: string): boolean {
    if (!this.config.supportedNetworks) return true;
    return this.config.supportedNetworks.includes(network);
  }

  /**
   * Get provider configuration
   */
  getConfig(): SMSProviderConfig {
    return this.config;
  }

  /**
   * Update provider statistics
   */
  updateStats(success: boolean, latency?: number): void {
    this.stats.totalSent++;
    
    if (success) {
      this.stats.totalDelivered++;
    } else {
      this.stats.totalFailed++;
    }

    // Calculate success rate
    this.stats.successRate = (this.stats.totalDelivered / this.stats.totalSent) * 100;

    // Update average latency
    if (latency) {
      const totalLatency = this.stats.avgLatency * (this.stats.totalSent - 1);
      this.stats.avgLatency = (totalLatency + latency) / this.stats.totalSent;
    }

    this.stats.lastUsed = new Date();

    logger.debug({
      provider: this.config.name,
      stats: this.stats,
    }, 'Provider stats updated');
  }

  /**
   * Get provider statistics
   */
  getStats(): ProviderStats {
    return this.stats;
  }

  /**
   * Validate phone number format
   */
  protected validatePhoneNumber(phone: string): boolean {
    // E.164 format validation
    const e164Regex = /^\+?[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  /**
   * Normalize phone number to provider format
   */
  protected normalizePhoneNumber(phone: string, countryCode: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Remove + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // If it starts with 0, replace with country code
    if (cleaned.startsWith('0')) {
      const countryCodeMap: Record<string, string> = {
        'GH': '233',
        'NG': '234',
        'KE': '254',
        'ZA': '27',
        'UG': '256',
        'TZ': '255',
        'RW': '250',
        'CI': '225',
        'SN': '221',
        'CM': '237',
      };

      const code = countryCodeMap[countryCode];
      if (code) {
        cleaned = code + cleaned.substring(1);
      }
    }

    return cleaned;
  }

  /**
   * Calculate message units (SMS segments)
   */
  protected calculateMessageUnits(message: string): number {
    const length = message.length;
    const gsm7Regex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-Z¨ÄÖÑܧ¿a-z¬äöñüà]*$/;

    if (gsm7Regex.test(message)) {
      // GSM-7 encoding
      if (length <= 160) return 1;
      return Math.ceil(length / 153);
    } else {
      // UCS-2 encoding
      if (length <= 70) return 1;
      return Math.ceil(length / 67);
    }
  }

  /**
   * Test provider connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const balance = await this.checkBalance();
      return balance.balance >= 0;
    } catch (error) {
      logger.error({ error, provider: this.config.name }, 'Provider connection test failed');
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    message: string;
    balance?: number;
  }> {
    try {
      const balance = await this.checkBalance();
      
      if (balance.error) {
        return {
          healthy: false,
          message: balance.error,
        };
      }

      return {
        healthy: true,
        message: 'Provider is healthy',
        balance: balance.balance,
      };
    } catch (error: any) {
      return {
        healthy: false,
        message: error.message || 'Health check failed',
      };
    }
  }
}