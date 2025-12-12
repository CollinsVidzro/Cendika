// src/modules/email/services/email.service.ts

import { prisma } from '@core/database/prisma.client';
import { smtpService } from '@/modules/email/services/smtp/smtp.service';
import { emailValidationService } from './email-validation.service';
import { reactEmailService } from './react-email.service';
import { logger } from '@utils/logger';
import type {
  SendEmailRequest,
  BulkEmailRequest,
  EmailResponse,
  BulkEmailResponse,
  EmailStatusResponse,
  EmailAnalytics,
} from '../types/email.types';
import { EmailStatus } from '../../../../generated/prisma/client';
import { randomBytes } from 'crypto';

export class EmailService {
  /**
   * Send a single email
   */
  async sendEmail(
    accountId: string,
    request: SendEmailRequest
  ): Promise<EmailResponse> {
    // Validate recipients
    const validationResults = await emailValidationService.validateRecipients([
      ...request.to.map(t => typeof t === 'string' ? t : t.email),
    ]);

    const invalidEmails = validationResults.filter(r => !r.valid);
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid email addresses: ${invalidEmails.map(e => e.email).join(', ')}`);
    }

    // Check account balance
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { 
        walletBalance: true, 
        creditBalance: true,
        contactEmail: true,
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Calculate cost (configurable per account)
    const emailCost = 0.01; // $0.01 per email
    const totalCost = emailCost * request.to.length;

    if (account.walletBalance < totalCost && account.creditBalance < totalCost) {
      throw new Error('Insufficient balance to send email');
    }

    // Process template if provided
    let htmlContent = request.html;
    let textContent = request.text;

    if (request.templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: request.templateId },
      });

      if (!template) {
        throw new Error('Email template not found');
      }

      // Render template with data
      if (template.reactTemplate) {
        htmlContent = await reactEmailService.renderReactEmail(
          template.reactTemplate,
          request.templateData || {}
        );
      } else {
        htmlContent = this.renderTemplate(template.htmlContent, request.templateData || {});
        textContent = template.textContent 
          ? this.renderTemplate(template.textContent, request.templateData || {})
          : undefined;
      }

      // Update template usage
      await prisma.emailTemplate.update({
        where: { id: request.templateId },
        data: { useCount: { increment: 1 } },
      });
    }

    // Get or create default domain for sender
    const fromEmail = typeof request.from === 'string' ? request.from : request.from.email;
    const senderDomain = fromEmail.split('@')[1];

    // Create email record
    const email = await prisma.emailMessage.create({
      data: {
        accountId,
        to: request.to.map(t => typeof t === 'string' ? t : t.email).join(','),
        cc: request.cc?.map(c => typeof c === 'string' ? c : c.email).join(','),
        bcc: request.bcc?.map(b => typeof b === 'string' ? b : b.email).join(','),
        subject: request.subject,
        htmlContent,
        textContent,
        templateId: request.templateId,
        status: request.scheduledFor ? EmailStatus.PENDING : EmailStatus.PENDING,
        cost: totalCost,
        metadata: request.metadata as any,
        tags: request.tags,
      },
    });

    // If scheduled, don't send now
    if (request.scheduledFor) {
      logger.info(`Email ${email.id} scheduled for ${request.scheduledFor}`);
      return this.formatEmailResponse(email);
    }

    // Send email via SMTP
    try {
      const result = await smtpService.sendEmail({
        from: request.from,
        to: request.to,
        cc: request.cc,
        bcc: request.bcc,
        replyTo: request.replyTo,
        subject: request.subject,
        html: htmlContent,
        text: textContent,
        attachments: request.attachments,
        headers: request.headers,
        messageId: `<${email.id}@africommunications.io>`,
      });

      // Update email status
      await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          status: EmailStatus.SENT,
          providerId: result.messageId,
          updatedAt: new Date(),
        },
      });

      // Deduct cost from account
      await this.deductBalance(accountId, totalCost);

      // Record transaction
      await prisma.transaction.create({
        data: {
          accountId,
          type: 'EMAIL_DEBIT',
          amount: -totalCost,
          currency: 'GHS',
          description: `Email sent to ${request.to.length} recipient(s)`,
          serviceType: 'email',
          status: 'completed',
        },
      });

      logger.info(`Email sent successfully: ${email.id}`, {
        messageId: result.messageId,
        recipients: request.to.length,
      });

      return this.formatEmailResponse({
        ...email,
        status: EmailStatus.SENT,
        providerId: result.messageId,
      });
    } catch (error) {
      logger.error(`Failed to send email ${email.id}:`, error);

      // Update email status to failed
      await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          status: EmailStatus.FAILED,
          providerMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        },
      });

      throw new Error('Failed to send email: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(
    accountId: string,
    request: BulkEmailRequest
  ): Promise<BulkEmailResponse> {
    const batchId = `batch_${randomBytes(16).toString('hex')}`;
    const results: EmailResponse[] = [];
    let queued = 0;
    let failed = 0;

    // Process in batches
    const batchSize = request.batchSize || 50;
    for (let i = 0; i < request.recipients.length; i += batchSize) {
      const batch = request.recipients.slice(i, i + batchSize);

      for (const recipient of batch) {
        try {
          const emailRequest: SendEmailRequest = {
            from: request.from,
            to: recipient.to,
            cc: recipient.cc,
            bcc: recipient.bcc,
            subject: request.subject,
            html: request.html,
            text: request.text,
            templateId: request.templateId,
            templateData: recipient.templateData,
            attachments: request.attachments,
            headers: request.headers,
            tags: request.tags,
            metadata: { ...request.metadata, batchId },
            scheduledFor: request.scheduledFor,
          };

          const result = await this.sendEmail(accountId, emailRequest);
          results.push(result);
          queued++;
        } catch (error) {
          logger.error('Failed to send bulk email:', error);
          failed++;
        }
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < request.recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      batchId,
      totalEmails: request.recipients.length,
      queued,
      failed,
      emails: results,
    };
  }

  /**
   * Get email status
   */
  async getEmailStatus(accountId: string, emailId: string): Promise<EmailStatusResponse> {
    const email = await prisma.emailMessage.findFirst({
      where: {
        id: emailId,
        accountId,
      },
    });

    if (!email) {
      throw new Error('Email not found');
    }

    // Build events from email status changes
    const events = [];

    if (email.status === EmailStatus.SENT) {
      events.push({
        type: 'sent' as const,
        timestamp: email.updatedAt,
      });
    }

    if (email.status === EmailStatus.DELIVERED && email.updatedAt) {
      events.push({
        type: 'delivered' as const,
        timestamp: email.updatedAt,
      });
    }

    if (email.openedAt) {
      events.push({
        type: 'opened' as const,
        timestamp: email.openedAt,
      });
    }

    if (email.clickedAt) {
      events.push({
        type: 'clicked' as const,
        timestamp: email.clickedAt,
      });
    }

    if (email.status === EmailStatus.BOUNCED) {
      events.push({
        type: 'bounced' as const,
        timestamp: email.updatedAt,
        metadata: { bounceType: email.bounceType },
      });
    }

    if (email.status === EmailStatus.COMPLAINED) {
      events.push({
        type: 'complained' as const,
        timestamp: email.updatedAt,
        metadata: { complaintType: email.complaintType },
      });
    }

    if (email.status === EmailStatus.FAILED) {
      events.push({
        type: 'failed' as const,
        timestamp: email.updatedAt,
        metadata: { error: email.providerMessage },
      });
    }

    return {
      id: email.id,
      status: email.status.toLowerCase() as any,
      to: email.to.split(','),
      from: email.to.split(',')[0], // Get from metadata if stored
      subject: email.subject,
      sentAt: email.status === EmailStatus.SENT ? email.updatedAt : undefined,
      deliveredAt: email.status === EmailStatus.DELIVERED ? email.updatedAt : undefined,
      openedAt: email.openedAt || undefined,
      clickedAt: email.clickedAt || undefined,
      bounceType: email.bounceType || undefined,
      complaintType: email.complaintType || undefined,
      error: email.status === EmailStatus.FAILED ? email.providerMessage || undefined : undefined,
      events,
    };
  }

  /**
   * Get email analytics
   */
  async getAnalytics(
    accountId: string,
    from?: Date,
    to?: Date
  ): Promise<EmailAnalytics> {
    const where = {
      accountId,
      createdAt: {
        gte: from,
        lte: to,
      },
    };

    const [
      totalSent,
      totalDelivered,
      totalBounced,
      totalOpened,
      totalClicked,
      totalComplained,
    ] = await Promise.all([
      prisma.emailMessage.count({
        where: { ...where, status: EmailStatus.SENT },
      }),
      prisma.emailMessage.count({
        where: { ...where, status: EmailStatus.DELIVERED },
      }),
      prisma.emailMessage.count({
        where: { ...where, status: EmailStatus.BOUNCED },
      }),
      prisma.emailMessage.count({
        where: { ...where, openedAt: { not: null } },
      }),
      prisma.emailMessage.count({
        where: { ...where, clickedAt: { not: null } },
      }),
      prisma.emailMessage.count({
        where: { ...where, status: EmailStatus.COMPLAINED },
      }),
    ]);

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
    const complaintRate = totalDelivered > 0 ? (totalComplained / totalDelivered) * 100 : 0;

    return {
      totalSent,
      totalDelivered,
      totalBounced,
      totalOpened,
      totalClicked,
      totalComplained,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      complaintRate: Math.round(complaintRate * 100) / 100,
    };
  }

  /**
   * Render template with variables
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    let rendered = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    return rendered;
  }

  /**
   * Deduct balance from account
   */
  private async deductBalance(accountId: string, amount: number): Promise<void> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { walletBalance: true, creditBalance: true },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (account.walletBalance >= amount) {
      await prisma.account.update({
        where: { id: accountId },
        data: { walletBalance: { decrement: amount } },
      });
    } else {
      await prisma.account.update({
        where: { id: accountId },
        data: { creditBalance: { decrement: amount } },
      });
    }
  }

  /**
   * Format email response
   */
  private formatEmailResponse(email: any): EmailResponse {
    return {
      id: email.id,
      status: email.status.toLowerCase(),
      to: email.to.split(','),
      from: email.to.split(',')[0],
      subject: email.subject,
      createdAt: email.createdAt,
      scheduledFor: email.scheduledFor,
      metadata: email.metadata,
    };
  }
}

export const emailService = new EmailService();