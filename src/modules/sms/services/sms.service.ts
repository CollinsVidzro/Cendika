import { logger } from '@utils/logger';
import prisma from '@database/prisma.client';
import { SMSValidationService } from './sms-validation.service';
import { SMSRouterService } from './sms-router.service';
import { SMSAnalyticsService } from './sms-analytics.service';
import { SMSProviderRouter } from '@core/providers/sms';
import type { 
  SendSMSRequest, 
  BulkSMSRequest, 
  SMSResponse, 
  BulkSMSResponse,
  SMSStatus 
} from '../types/sms.types';
import { MessageStatus, MessageType } from '../../../../generated/prisma/client';
import { nanoid } from 'nanoid';

export class SMSService {
  // Send single SMS
  static async sendSMS(
    accountId: string,
    request: SendSMSRequest
  ): Promise<SMSResponse> {
    try {
      // Validate phone number
      const validation = SMSValidationService.validatePhoneNumber(request.to);
      if (!validation.valid) {
        throw new Error(`Invalid phone number: ${validation.errors?.join(', ')}`);
      }

      // Validate message
      const messageValidation = SMSValidationService.validateMessage(request.message);
      if (!messageValidation.valid) {
        throw new Error(`Invalid message: ${messageValidation.errors?.join(', ')}`);
      }

      // Calculate message units
      const messageUnits = SMSValidationService.calculateMessageUnits(request.message);

      // Get sender ID
      const senderId = await this.resolveSenderId(accountId, request.senderId);

      // Route message and get provider
      const routing = await SMSRouterService.routeMessage(
        validation.formatted,
        MessageType.SMS
      );

      if (!routing.provider) {
        throw new Error('No SMS provider available for this destination');
      }

      // Calculate cost
      const pricing = await SMSRouterService.getPricing(
        routing.country,
        routing.network,
        MessageType.SMS,
        messageUnits.units
      );

      // Check if scheduled
      const isScheduled = request.scheduledFor && new Date(request.scheduledFor) > new Date();
      
      // Create message in database
      const message = await prisma.message.create({
        data: {
          accountId,
          recipient: validation.formatted,
          recipientCountry: routing.country,
          recipientNetwork: routing.network,
          content: request.message,
          messageType: MessageType.SMS,
          senderId: senderId.id,
          senderName: senderId.name,
          status: isScheduled ? MessageStatus.PENDING : MessageStatus.QUEUED,
          provider: routing.provider.name,
          units: messageUnits.units,
          unitCost: pricing.ratePerUnit,
          totalCost: pricing.totalCost,
          currency: pricing.currency,
          scheduledFor: request.scheduledFor,
          metadata: request.metadata,
          tags: request.tags || [],
        },
      });

      // If not scheduled, send immediately
      if (!isScheduled) {
        this.sendViaProvider(
          message.id,
          validation.formatted,
          request.message,
          senderId.name,
          routing.country,
          routing.network
        ).catch(err => {
          logger.error({ error: err, messageId: message.id }, 'Failed to send SMS');
        });
      }

      // Update daily stats
      SMSAnalyticsService.updateDailyStats(
        accountId,
        message.status,
        pricing.totalCost
      ).catch(err => {
        logger.error({ error: err }, 'Failed to update daily stats');
      });

      logger.info({
        messageId: message.id,
        to: validation.formatted,
        provider: routing.provider.name,
        cost: pricing.totalCost,
      }, 'SMS queued for sending');

      return {
        id: message.id,
        to: validation.formatted,
        from: senderId.name,
        message: request.message,
        status: message.status,
        provider: routing.provider.name,
        cost: pricing.totalCost,
        currency: pricing.currency,
        units: messageUnits.units,
        scheduledFor: request.scheduledFor,
        createdAt: message.createdAt,
      };

    } catch (error: any) {
      logger.error({ error, accountId, request }, 'SMS send error');
      throw error;
    }
  }

  // Send via provider (actual delivery)
  private static async sendViaProvider(
    messageId: string,
    recipient: string,
    message: string,
    senderId: string,
    country: string,
    network?: string
  ): Promise<void> {
    try {
      // Update status to sending
      await prisma.message.update({
        where: { id: messageId },
        data: { 
          status: MessageStatus.SENT,
          queuedAt: new Date(),
        },
      });

      // Send via provider router
      const response = await SMSProviderRouter.sendSMS(
        {
          recipient,
          message,
          senderId,
          messageId,
        },
        country,
        network
      );

      if (response.success) {
        // Update message with provider response
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: MessageStatus.SENT,
            providerId: response.externalId,
            providerStatus: response.status,
            providerMessage: response.message,
            sentAt: new Date(),
          },
        });

        logger.info({
          messageId,
          providerId: response.externalId,
          provider: response.providerId,
        }, 'SMS sent successfully');

      } else {
        // Update message as failed
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: MessageStatus.FAILED,
            errorCode: response.errorCode,
            errorMessage: response.message,
            failedAt: new Date(),
          },
        });

        logger.error({
          messageId,
          error: response.message,
          errorCode: response.errorCode,
        }, 'SMS send failed');
      }

    } catch (error: any) {
      logger.error({ error, messageId }, 'Provider send error');
      
      // Mark message as failed
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: MessageStatus.FAILED,
          errorMessage: error.message,
          failedAt: new Date(),
        },
      }).catch(err => {
        logger.error({ error: err, messageId }, 'Failed to update message status');
      });
    }
  }

  // Send bulk SMS
  static async sendBulkSMS(
    accountId: string,
    request: BulkSMSRequest
  ): Promise<BulkSMSResponse> {
    try {
      const batchId = nanoid(16);
      const results: Array<{ id: string; to: string; status: 'accepted' | 'rejected'; error?: string }> = [];
      let totalCost = 0;

      // Get sender ID
      const senderId = await this.resolveSenderId(accountId, request.senderId);

      // Process each recipient
      for (const recipient of request.recipients) {
        try {
          // Use recipient-specific message or default message
          const message = recipient.message || request.message;
          if (!message) {
            results.push({
              id: '',
              to: recipient.to,
              status: 'rejected',
              error: 'No message provided',
            });
            continue;
          }

          // Replace variables if provided
          let finalMessage = message;
          if (recipient.variables) {
            finalMessage = SMSValidationService.replaceVariables(message, recipient.variables);
          }

          // Validate phone number
          const validation = SMSValidationService.validatePhoneNumber(recipient.to);
          if (!validation.valid) {
            results.push({
              id: '',
              to: recipient.to,
              status: 'rejected',
              error: validation.errors?.join(', '),
            });
            continue;
          }

          // Calculate message units
          const messageUnits = SMSValidationService.calculateMessageUnits(finalMessage);

          // Route message
          const routing = await SMSRouterService.routeMessage(
            validation.formatted,
            MessageType.BULK
          );

          if (!routing.provider) {
            results.push({
              id: '',
              to: recipient.to,
              status: 'rejected',
              error: 'No provider available',
            });
            continue;
          }

          // Calculate cost
          const pricing = await SMSRouterService.getPricing(
            routing.country,
            routing.network,
            MessageType.BULK,
            messageUnits.units
          );

          // Create message
          const msg = await prisma.message.create({
            data: {
              accountId,
              recipient: validation.formatted,
              recipientCountry: routing.country,
              recipientNetwork: routing.network,
              content: finalMessage,
              messageType: MessageType.BULK,
              senderId: senderId.id,
              senderName: senderId.name,
              status: MessageStatus.QUEUED,
              provider: routing.provider.name,
              units: messageUnits.units,
              unitCost: pricing.ratePerUnit,
              totalCost: pricing.totalCost,
              currency: pricing.currency,
              batchId,
              scheduledFor: request.scheduledFor,
              metadata: request.metadata,
              tags: request.tags || [],
            },
          });

          totalCost += pricing.totalCost;

          results.push({
            id: msg.id,
            to: validation.formatted,
            status: 'accepted',
          });

          // Send via provider
          this.sendViaProvider(
            msg.id,
            validation.formatted,
            finalMessage,
            senderId.name,
            routing.country,
            routing.network
          ).catch(err => {
            logger.error({ error: err, messageId: msg.id }, 'Failed to send bulk SMS');
          });

        } catch (error: any) {
          logger.error({ error, recipient }, 'Recipient processing error');
          results.push({
            id: '',
            to: recipient.to,
            status: 'rejected',
            error: error.message,
          });
        }
      }

      const accepted = results.filter(r => r.status === 'accepted').length;
      const rejected = results.filter(r => r.status === 'rejected').length;

      logger.info({
        batchId,
        total: request.recipients.length,
        accepted,
        rejected,
        totalCost,
      }, 'Bulk SMS processed');

      return {
        batchId,
        totalRecipients: request.recipients.length,
        accepted,
        rejected,
        estimatedCost: totalCost,
        currency: 'GHS',
        messages: results,
      };

    } catch (error: any) {
      logger.error({ error, accountId }, 'Bulk SMS error');
      throw error;
    }
  }

  // Get SMS status
  static async getSMSStatus(messageId: string, accountId: string): Promise<SMSStatus> {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          accountId,
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      return {
        id: message.id,
        to: message.recipient,
        status: message.status,
        provider: message.provider || undefined,
        providerId: message.providerId || undefined,
        sentAt: message.sentAt || undefined,
        deliveredAt: message.deliveredAt || undefined,
        failedAt: message.failedAt || undefined,
        errorCode: message.errorCode || undefined,
        errorMessage: message.errorMessage || undefined,
      };

    } catch (error: any) {
      logger.error({ error, messageId }, 'Get SMS status error');
      throw error;
    }
  }

  // Get messages by batch ID
  static async getBatchMessages(batchId: string, accountId: string) {
    try {
      const messages = await prisma.message.findMany({
        where: {
          batchId,
          accountId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const stats = {
        total: messages.length,
        pending: messages.filter(m => m.status === MessageStatus.PENDING).length,
        queued: messages.filter(m => m.status === MessageStatus.QUEUED).length,
        sent: messages.filter(m => m.status === MessageStatus.SENT).length,
        delivered: messages.filter(m => m.status === MessageStatus.DELIVERED).length,
        failed: messages.filter(m => m.status === MessageStatus.FAILED).length,
        totalCost: messages.reduce((sum, m) => sum + m.totalCost, 0),
      };

      return {
        batchId,
        stats,
        messages: messages.map(m => ({
          id: m.id,
          to: m.recipient,
          status: m.status,
          cost: m.totalCost,
          createdAt: m.createdAt,
        })),
      };

    } catch (error: any) {
      logger.error({ error, batchId }, 'Get batch messages error');
      throw error;
    }
  }

  // Resolve sender ID
  private static async resolveSenderId(
    accountId: string,
    requestedSenderId?: string
  ): Promise<{ id: string; name: string }> {
    if (requestedSenderId) {
      const senderId = await prisma.senderId.findFirst({
        where: {
          accountId,
          name: requestedSenderId,
          status: 'APPROVED',
          isActive: true,
        },
      });

      if (senderId) {
        return { id: senderId.id, name: senderId.name };
      }

      logger.warn({ accountId, requestedSenderId }, 'Requested sender ID not found, using default');
    }

    // Get default sender ID
    const defaultSender = await prisma.senderId.findFirst({
      where: {
        accountId,
        status: 'APPROVED',
        isActive: true,
        isDefault: true,
      },
    });

    if (defaultSender) {
      return { id: defaultSender.id, name: defaultSender.name };
    }

    // Get any approved sender ID
    const anySender = await prisma.senderId.findFirst({
      where: {
        accountId,
        status: 'APPROVED',
        isActive: true,
      },
    });

    if (anySender) {
      return { id: anySender.id, name: anySender.name };
    }

    throw new Error('No approved sender ID found. Please register a sender ID first.');
  }
}