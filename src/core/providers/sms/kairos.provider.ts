import { KairosSMS, asPromise } from '@kairosafrika/sms';
import { BaseSMSProvider } from './base-sms.provider';
import type {
  SMSProviderConfig,
  SendSMSOptions,
  ProviderResponse,
  DeliveryStatus,
  ProviderBalance,
} from './base-sms.provider';
import { logger } from '@utils/logger';

interface KairosCredentials {
  apiKey: string;
  apiSecret: string;
  timeout?: number;
}

/**
 * Kairos SMS Provider for Ghana
 * Official provider using @kairosafrika/sms package
 */
export class KairosProvider extends BaseSMSProvider {
  private kairosInstance: any;

  constructor(config: SMSProviderConfig) {
    super(config);
    this.initializeKairos();
  }

  /**
   * Initialize Kairos SDK
   */
  private initializeKairos() {
    const credentials = this.config.credentials as KairosCredentials;

    this.kairosInstance = KairosSMS.create({
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      timeout: credentials.timeout || 30000,
    });

    logger.info('Kairos SMS provider initialized');
  }

  /**
   * Send SMS using Kairos
   */
  async sendSMS(options: SendSMSOptions): Promise<ProviderResponse> {
    const startTime = Date.now();

    try {
      const { recipient, message, senderId, messageId } = options;

      // Validate parameters
      const validationError = this.validateParameters(recipient, message, senderId);
      if (validationError) {
        logger.warn({ recipient, senderId, error: validationError }, 'Kairos validation failed');
        this.updateStats(false);
        
        return {
          success: false,
          status: 'invalid_parameters',
          message: validationError,
          errorCode: '1702',
          providerId: this.getProviderId(),
        };
      }

      // Prepare payload
      const payload = {
        to: recipient,
        from: senderId,
        message: message,
      };

      logger.info({
        recipient: this.maskPhone(recipient),
        senderId,
        messageLength: message.length,
      }, 'Sending SMS via Kairos');

      // Send via Kairos SDK
      const response = await asPromise(
        this.kairosInstance.send(payload).asQuick()
      );

      const latency = Date.now() - startTime;

      logger.info({
        success: response.success,
        statusCode: response.statusCode,
        latency: `${latency}ms`,
      }, 'Kairos SMS response received');

      // Update stats
      this.updateStats(response.success === true, latency);

      return this.parseKairosResponse(response, messageId);

    } catch (error: any) {
      const latency = Date.now() - startTime;
      this.updateStats(false, latency);

      logger.error({ error, provider: 'Kairos' }, 'Kairos SMS error');
      return this.handleKairosError(error);
    }
  }

  /**
   * Check delivery status
   */
  async getDeliveryStatus(externalId: string): Promise<DeliveryStatus> {
    try {
      logger.debug({ externalId }, 'Checking Kairos delivery status');

      const response = await asPromise(
        this.kairosInstance.send(externalId).asPing()
      );

      const status = this.mapDeliveryStatus(
        response.data?.status || response.status
      );

      return {
        status: status,
        timestamp: new Date(),
        externalId: externalId,
        error: response.success ? undefined : response.statusMessage,
      };

    } catch (error: any) {
      logger.error({ error, externalId }, 'Kairos delivery status check failed');
      
      return {
        status: 'unknown',
        externalId: externalId,
        error: error.message || 'Failed to get delivery status',
      };
    }
  }

  /**
   * Check account balance
   */
  async checkBalance(): Promise<ProviderBalance> {
    try {
      logger.debug('Checking Kairos account balance');

      const response = await asPromise(
        this.kairosInstance.account().balance()
      );

      if (response.success && response.data) {
        return {
          balance: parseFloat(response.data.balance) || 0,
          currency: 'GHS',
        };
      }

      return {
        balance: 0,
        currency: 'GHS',
        error: response.statusMessage || 'Failed to get balance',
      };

    } catch (error: any) {
      logger.error({ error }, 'Kairos balance check failed');
      
      return {
        balance: 0,
        currency: 'GHS',
        error: error.message || 'Failed to check balance',
      };
    }
  }

  /**
   * Validate parameters for Kairos
   */
  private validateParameters(
    recipient: string,
    message: string,
    senderId: string
  ): string | null {
    if (!recipient || !message || !senderId) {
      return 'Missing required parameters: recipient, message, or senderId';
    }

    // Validate recipient format for Ghana (233XXXXXXXXX)
    if (!/^233[2345][0-9]{8}$/.test(recipient)) {
      return 'Invalid Ghana phone number format. Must be 233XXXXXXXXX';
    }

    // Validate message
    if (message.length === 0) {
      return 'Message cannot be empty';
    }

    // Validate sender ID (Kairos allows spaces)
    if (senderId.length < 3 || senderId.length > 11) {
      return 'Sender ID must be between 3 and 11 characters';
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(senderId)) {
      return 'Sender ID can only contain letters, numbers, and spaces';
    }

    return null;
  }

  /**
   * Parse Kairos response
   */
  private parseKairosResponse(
    response: any,
    messageId?: string
  ): ProviderResponse {
    try {
      // Success response
      if (response.success === true && response.statusCode === 200) {
        return {
          success: true,
          status: 'submitted',
          externalId: response.data?.id || response.data?.uuid || messageId,
          message: response.statusMessage || 'Message submitted successfully',
          providerId: this.getProviderId(),
        };
      }

      // Error response
      return {
        success: false,
        status: this.mapKairosStatus(response.statusCode),
        message: response.statusMessage || 'Failed to send SMS',
        errorCode: response.statusCode?.toString() || '1710',
        providerId: this.getProviderId(),
      };

    } catch (parseError) {
      logger.error({ error: parseError }, 'Failed to parse Kairos response');
      
      return {
        success: false,
        status: 'failed',
        message: 'Failed to parse provider response',
        errorCode: '1710',
        providerId: this.getProviderId(),
      };
    }
  }

  /**
   * Handle Kairos errors
   */
  private handleKairosError(error: any): ProviderResponse {
    if (error?.statusCode) {
      return {
        success: false,
        status: this.mapKairosStatus(error.statusCode),
        message: error.statusMessage || error.message,
        errorCode: error.statusCode.toString(),
        providerId: this.getProviderId(),
      };
    }

    return {
      success: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown provider error',
      errorCode: '1710',
      providerId: this.getProviderId(),
    };
  }

  /**
   * Map Kairos status codes
   */
  private mapKairosStatus(statusCode: number): ProviderResponse['status'] {
    const statusMap: Record<number, ProviderResponse['status']> = {
      200: 'submitted',
      201: 'submitted',
      400: 'invalid_parameters',
      401: 'authentication_error',
      403: 'insufficient_credit',
      500: 'provider_error',
    };

    return statusMap[statusCode] || 'rejected';
  }

  /**
   * Map delivery status
   */
  private mapDeliveryStatus(kairosStatus: string): DeliveryStatus['status'] {
    const statusMap: Record<string, DeliveryStatus['status']> = {
      pending: 'sent',
      success: 'delivered',
      failed: 'failed',
      accepted: 'sent',
      delivered: 'delivered',
      undelivered: 'failed',
      rejected: 'failed',
      submitted: 'sent',
    };

    return statusMap[kairosStatus?.toLowerCase()] || 'unknown';
  }

  /**
   * Mask phone number for logging
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 4) return '***';
    return phone.substring(0, 4) + '***' + phone.substring(phone.length - 3);
  }
}

export default KairosProvider;