import { BaseSMSProvider, SMSProviderConfig } from './base-sms.provider';
import { KairosProvider } from './kairos.provider';
import { AfricasTalkingProvider } from './africastalking.provider';
import { MTNProvider } from './mtn.provider';
import { TwilioProvider } from './twilio.provider';
import { logger } from '@utils/logger';
import { env } from '@config/env';

/**
 * SMS Provider Factory
 * Creates and manages SMS provider instances
 */
export class SMSProviderFactory {
  private static providers: Map<string, BaseSMSProvider> = new Map();

  /**
   * Initialize all configured providers
   */
  static async initializeProviders(): Promise<void> {
    logger.info('Initializing SMS providers...');

    // Initialize Kairos (Ghana)
    if (env.KAIROS_API_KEY && env.KAIROS_API_SECRET) {
      try {
        const kairos = this.createProvider('kairos', {
          name: 'Kairos',
          type: 'SMS',
          credentials: {
            apiKey: env.KAIROS_API_KEY,
            apiSecret: env.KAIROS_API_SECRET,
            timeout: 30000,
          },
          supportedCountries: ['GH'],
          supportedNetworks: ['mtn', 'telecel', 'at'],
          priority: 1,
        });

        this.providers.set('kairos', kairos);
        logger.info('✓ Kairos provider initialized');
      } catch (error) {
        logger.error({ error }, 'Failed to initialize Kairos provider');
      }
    }

    // Initialize Africa's Talking (Pan-African)
    if (env.AFRICASTALKING_API_KEY && env.AFRICASTALKING_USERNAME) {
      try {
        const at = this.createProvider('africastalking', {
          name: 'AfricasTalking',
          type: 'SMS',
          credentials: {
            apiKey: env.AFRICASTALKING_API_KEY,
            username: env.AFRICASTALKING_USERNAME,
          },
          supportedCountries: [
            'KE', 'UG', 'TZ', 'RW', 'NG', 'GH', 'ZA', 
            'BF', 'ML', 'SN', 'CI', 'BJ', 'TG', 'NE'
          ],
          priority: 2,
        });

        this.providers.set('africastalking', at);
        logger.info('✓ Africa\'s Talking provider initialized');
      } catch (error) {
        logger.error({ error }, 'Failed to initialize Africa\'s Talking provider');
      }
    }

    // Initialize MTN (Multi-country)
    if (env.MTN_API_KEY && env.MTN_API_SECRET) {
      try {
        const mtn = this.createProvider('mtn', {
          name: 'MTN',
          type: 'SMS',
          credentials: {
            apiKey: env.MTN_API_KEY,
            apiSecret: env.MTN_API_SECRET,
          },
          supportedCountries: [
            'GH', 'NG', 'ZA', 'UG', 'RW', 'CM', 'BJ',
            'CI', 'GN', 'ZM', 'SS', 'SZ'
          ],
          supportedNetworks: ['mtn'],
          priority: 3,
        });

        this.providers.set('mtn', mtn);
        logger.info('✓ MTN provider initialized');
      } catch (error) {
        logger.error({ error }, 'Failed to initialize MTN provider');
      }
    }

    // Initialize Twilio (Global fallback)
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = this.createProvider('twilio', {
          name: 'Twilio',
          type: 'SMS',
          credentials: {
            accountSid: env.TWILIO_ACCOUNT_SID,
            authToken: env.TWILIO_AUTH_TOKEN,
            phoneNumber: env.TWILIO_PHONE_NUMBER,
          },
          supportedCountries: ['*'], // Global
          priority: 10, // Lowest priority (fallback)
        });

        this.providers.set('twilio', twilio);
        logger.info('✓ Twilio provider initialized');
      } catch (error) {
        logger.error({ error }, 'Failed to initialize Twilio provider');
      }
    }

    logger.info(`SMS providers initialized: ${this.providers.size} active`);
  }

  /**
   * Create provider instance
   */
  private static createProvider(
    type: string,
    config: SMSProviderConfig
  ): BaseSMSProvider {
    switch (type.toLowerCase()) {
      case 'kairos':
        return new KairosProvider(config);
      
      case 'africastalking':
        return new AfricasTalkingProvider(config);
      
      case 'mtn':
        return new MTNProvider(config);
      
      case 'twilio':
        return new TwilioProvider(config);
      
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Get provider by name
   */
  static getProvider(name: string): BaseSMSProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  /**
   * Get all providers
   */
  static getAllProviders(): BaseSMSProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers for country
   */
  static getProvidersForCountry(countryCode: string): BaseSMSProvider[] {
    return this.getAllProviders()
      .filter(provider => 
        provider.supportsCountry(countryCode) || 
        provider.getConfig().supportedCountries.includes('*')
      )
      .sort((a, b) => {
        const priorityA = a.getConfig().priority || 999;
        const priorityB = b.getConfig().priority || 999;
        return priorityA - priorityB;
      });
  }

  /**
   * Get providers for network
   */
  static getProvidersForNetwork(
    countryCode: string,
    network: string
  ): BaseSMSProvider[] {
    return this.getProvidersForCountry(countryCode)
      .filter(provider => provider.supportsNetwork(network));
  }

  /**
   * Health check all providers
   */
  static async healthCheckAll(): Promise<{
    [key: string]: {
      healthy: boolean;
      message: string;
      balance?: number;
    };
  }> {
    const results: any = {};

    for (const [name, provider] of this.providers) {
      results[name] = await provider.healthCheck();
    }

    return results;
  }

  /**
   * Get provider statistics
   */
  static getProviderStats(): {
    [key: string]: any;
  } {
    const stats: any = {};

    for (const [name, provider] of this.providers) {
      stats[name] = {
        ...provider.getStats(),
        config: {
          countries: provider.getConfig().supportedCountries,
          networks: provider.getConfig().supportedNetworks,
          priority: provider.getConfig().priority,
        },
      };
    }

    return stats;
  }
}

export default SMSProviderFactory;