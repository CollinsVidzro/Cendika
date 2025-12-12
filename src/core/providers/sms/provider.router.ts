import { BaseSMSProvider, SendSMSOptions, ProviderResponse } from './base-sms.provider';
import { SMSProviderFactory } from './provider.factory';
import { logger } from '@utils/logger';

/**
 * SMS Provider Router
 * Intelligently routes SMS to the best available provider
 */
export class SMSProviderRouter {
  /**
   * Route and send SMS
   */
  static async sendSMS(
    options: SendSMSOptions,
    country: string,
    network?: string
  ): Promise<ProviderResponse> {
    try {
      // Get available providers
      const providers = network
        ? SMSProviderFactory.getProvidersForNetwork(country, network)
        : SMSProviderFactory.getProvidersForCountry(country);

      if (providers.length === 0) {
        logger.error({ country, network }, 'No SMS providers available');
        
        return {
          success: false,
          status: 'failed',
          message: `No SMS providers available for ${country}${network ? `/${network}` : ''}`,
          errorCode: 'NO_PROVIDER',
          providerId: 'none',
        };
      }

      logger.info({
        country,
        network,
        availableProviders: providers.map(p => p.getProviderName()),
      }, 'Routing SMS to provider');

      // Try each provider in order of priority
      let lastError: any;
      
      for (const provider of providers) {
        try {
          logger.debug({
            provider: provider.getProviderName(),
            recipient: this.maskPhone(options.recipient),
          }, 'Attempting to send via provider');

          const response = await provider.sendSMS(options);

          if (response.success) {
            logger.info({
              provider: provider.getProviderName(),
              status: response.status,
              externalId: response.externalId,
            }, 'SMS sent successfully');

            return response;
          }

          // Provider failed, try next
          logger.warn({
            provider: provider.getProviderName(),
            status: response.status,
            message: response.message,
          }, 'Provider failed, trying next');

          lastError = response;

        } catch (error: any) {
          logger.error({
            error,
            provider: provider.getProviderName(),
          }, 'Provider error, trying next');

          lastError = error;
          continue;
        }
      }

      // All providers failed
      logger.error({
        country,
        network,
        triedProviders: providers.length,
      }, 'All providers failed');

      return {
        success: false,
        status: 'failed',
        message: lastError?.message || 'All providers failed',
        errorCode: lastError?.errorCode || 'ALL_FAILED',
        providerId: 'multiple',
      };

    } catch (error: any) {
      logger.error({ error, country, network }, 'SMS routing error');

      return {
        success: false,
        status: 'failed',
        message: error.message || 'SMS routing failed',
        errorCode: 'ROUTING_ERROR',
        providerId: 'router',
      };
    }
  }

  /**
   * Get best provider for destination
   */
  static getBestProvider(
    country: string,
    network?: string,
    criteria?: 'cost' | 'speed' | 'reliability'
  ): BaseSMSProvider | null {
    const providers = network
      ? SMSProviderFactory.getProvidersForNetwork(country, network)
      : SMSProviderFactory.getProvidersForCountry(country);

    if (providers.length === 0) {
      return null;
    }

    // Apply selection criteria
    switch (criteria) {
      case 'speed':
        // Sort by latency (ascending)
        return providers.sort((a, b) => {
          const latencyA = a.getStats().avgLatency || 1000;
          const latencyB = b.getStats().avgLatency || 1000;
          return latencyA - latencyB;
        })[0];

      case 'reliability':
        // Sort by success rate (descending)
        return providers.sort((a, b) => {
          const rateA = a.getStats().successRate || 0;
          const rateB = b.getStats().successRate || 0;
          return rateB - rateA;
        })[0];

      case 'cost':
      default:
        // Use priority (lowest number = highest priority)
        return providers[0];
    }
  }

  /**
   * Check delivery status across providers
   */
  static async checkDeliveryStatus(
    externalId: string,
    providerName?: string
  ): Promise<any> {
    try {
      if (providerName) {
        const provider = SMSProviderFactory.getProvider(providerName);
        if (provider) {
          return await provider.getDeliveryStatus(externalId);
        }
      }

      // Try all providers
      const providers = SMSProviderFactory.getAllProviders();
      
      for (const provider of providers) {
        try {
          const status = await provider.getDeliveryStatus(externalId);
          if (status.status !== 'unknown') {
            return status;
          }
        } catch (error) {
          continue;
        }
      }

      return {
        status: 'unknown',
        externalId,
        error: 'Could not get status from any provider',
      };

    } catch (error: any) {
      logger.error({ error, externalId }, 'Delivery status check error');
      
      return {
        status: 'unknown',
        externalId,
        error: error.message,
      };
    }
  }

  /**
   * Mask phone number for logging
   */
  private static maskPhone(phone: string): string {
    if (phone.length <= 4) return '***';
    return phone.substring(0, 4) + '***' + phone.substring(phone.length - 3);
  }
}

export default SMSProviderRouter;