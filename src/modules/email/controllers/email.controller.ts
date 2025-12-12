// src/modules/email/controllers/email.controller.ts

import { Context } from 'hono';
import { emailService } from '../services/email.service';
import { emailValidationService } from '../services/email-validation.service';
import { reactEmailService } from '../services/react-email.service';
import { prisma } from '@core/database/prisma.client';
import { ResponseBuilder } from '@utils/api-response';
import { logger } from '@utils/logger';
import type {
  SendEmailInput,
  BulkEmailInput,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
//   AddDomainInput,
  RenderReactEmailInput,
} from '../schemas/email.schema';
//import { smtpService } from '@core/services/smtp/smtp.service';

export class EmailController {
  /**
   * Send a single email
   * POST /api/v1/email/send
   */
  async sendEmail(c: Context) {
    try {
      const accountId = c.get('accountId');
      const body = await c.req.json<SendEmailInput>();

      const result = await emailService.sendEmail(accountId, body);

      logger.info('Email sent', { accountId, emailId: result.id });

      return ResponseBuilder.success(
        c,
        result,
        'Email sent successfully',
        201
      );
    } catch (error) {
      logger.error('Failed to send email:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to send email',
        500
      );
    }
  }

  /**
   * Send bulk emails
   * POST /api/v1/email/bulk/send
   */
  async sendBulkEmails(c: Context) {
    try {
      const accountId = c.get('accountId');
      const body = await c.req.json<BulkEmailInput>();

      const result = await emailService.sendBulkEmails(accountId, body);

      logger.info('Bulk emails sent', {
        accountId,
        batchId: result.batchId,
        total: result.totalEmails,
      });

      return ResponseBuilder.success(
        c,
        result,
        `Bulk emails queued successfully`,
        202
      );
    } catch (error) {
      logger.error('Failed to send bulk emails:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to send bulk emails',
        500
      );
    }
  }

  /**
   * Get email status
   * GET /api/v1/email/:id/status
   */
  async getEmailStatus(c: Context) {
    try {
      const accountId = c.get('accountId');
      const emailId = c.req.param('id');

      const status = await emailService.getEmailStatus(accountId, emailId);

      return ResponseBuilder.success(c, status);
    } catch (error) {
      logger.error('Failed to get email status:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to get email status',
        error instanceof Error && error.message === 'Email not found' ? 404 : 500
      );
    }
  }

  /**
   * List emails
   * GET /api/v1/email
   */
  async listEmails(c: Context) {
    try {
      const accountId = c.get('accountId');
      const query = c.req.query();

      const where: any = { accountId };

      if (query.status) {
        where.status = query.status.toUpperCase();
      }

      if (query.from) {
        where.createdAt = { ...where.createdAt, gte: new Date(query.from) };
      }

      if (query.to) {
        where.createdAt = { ...where.createdAt, lte: new Date(query.to) };
      }

      if (query.tags) {
        where.tags = { hasSome: query.tags.split(',') };
      }

      const limit = query.limit ? parseInt(query.limit) : 50;
      const offset = query.offset ? parseInt(query.offset) : 0;

      const [emails, total] = await Promise.all([
        prisma.emailMessage.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.emailMessage.count({ where }),
      ]);

      return ResponseBuilder.success(c, {
        emails: emails.map(email => ({
          id: email.id,
          to: email.to.split(','),
          subject: email.subject,
          status: email.status.toLowerCase(),
          createdAt: email.createdAt,
          cost: email.cost,
          tags: email.tags,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (error) {
      logger.error('Failed to list emails:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to list emails',
        500
      );
    }
  }

  /**
   * Get email analytics
   * GET /api/v1/email/analytics
   */
  async getAnalytics(c: Context) {
    try {
      const accountId = c.get('accountId');
      const query = c.req.query();

      const from = query.from ? new Date(query.from) : undefined;
      const to = query.to ? new Date(query.to) : undefined;

      const analytics = await emailService.getAnalytics(accountId, from, to);

      return ResponseBuilder.success(c, analytics);
    } catch (error) {
      logger.error('Failed to get analytics:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to get analytics',
        500
      );
    }
  }

  /**
   * Create email template
   * POST /api/v1/email/templates
   */
  async createTemplate(c: Context) {
    try {
      const accountId = c.get('accountId');
      const body = await c.req.json<CreateEmailTemplateInput>();

      // Validate React component if provided
      if (body.reactTemplate) {
        const validation = reactEmailService.validateReactComponent(body.reactTemplate);
        if (!validation.valid) {
          return ResponseBuilder.error(
            c,
            `Invalid React component: ${validation.errors?.join(', ')}`,
            400
          );
        }
      }

      const template = await prisma.emailTemplate.create({
        data: {
          accountId,
          name: body.name,
          subject: body.subject,
          htmlContent: body.htmlContent,
          textContent: body.textContent,
          variables: body.variables || [],
          category: body.category,
          tags: body.tags,
          reactTemplate: body.reactTemplate,
          isActive: true,
        },
      });

      return ResponseBuilder.success(c, template, 'Template created successfully', 201);
    } catch (error) {
      logger.error('Failed to create template:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to create template',
        500
      );
    }
  }

  /**
   * List email templates
   * GET /api/v1/email/templates
   */
  async listTemplates(c: Context) {
    try {
      const accountId = c.get('accountId');
      const query = c.req.query();

      const where: any = {
        OR: [
          { accountId },
          { isSystem: true },
        ],
      };

      if (query.category) {
        where.category = query.category;
      }

      const templates = await prisma.emailTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return ResponseBuilder.success(c, { templates });
    } catch (error) {
      logger.error('Failed to list templates:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to list templates',
        500
      );
    }
  }

  /**
   * Get email template
   * GET /api/v1/email/templates/:id
   */
  async getTemplate(c: Context) {
    try {
      const accountId = c.get('accountId');
      const templateId = c.req.param('id');

      const template = await prisma.emailTemplate.findFirst({
        where: {
          id: templateId,
          OR: [
            { accountId },
            { isSystem: true },
          ],
        },
      });

      if (!template) {
        return ResponseBuilder.error(c, 'Template not found', 404);
      }

      return ResponseBuilder.success(c, template);
    } catch (error) {
      logger.error('Failed to get template:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to get template',
        500
      );
    }
  }

  /**
   * Update email template
   * PUT /api/v1/email/templates/:id
   */
  async updateTemplate(c: Context) {
    try {
      const accountId = c.get('accountId');
      const templateId = c.req.param('id');
      const body = await c.req.json<UpdateEmailTemplateInput>();

      // Check ownership
      const existing = await prisma.emailTemplate.findFirst({
        where: { id: templateId, accountId },
      });

      if (!existing) {
        return ResponseBuilder.error(c, 'Template not found', 404);
      }

      // Validate React component if provided
      if (body.reactTemplate) {
        const validation = reactEmailService.validateReactComponent(body.reactTemplate);
        if (!validation.valid) {
          return ResponseBuilder.error(
            c,
            `Invalid React component: ${validation.errors?.join(', ')}`,
            400
          );
        }
      }

      const template = await prisma.emailTemplate.update({
        where: { id: templateId },
        data: body,
      });

      return ResponseBuilder.success(c, template, 'Template updated successfully');
    } catch (error) {
      logger.error('Failed to update template:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to update template',
        500
      );
    }
  }

  /**
   * Delete email template
   * DELETE /api/v1/email/templates/:id
   */
  async deleteTemplate(c: Context) {
    try {
      const accountId = c.get('accountId');
      const templateId = c.req.param('id');

      const template = await prisma.emailTemplate.findFirst({
        where: { id: templateId, accountId },
      });

      if (!template) {
        return ResponseBuilder.error(c, 'Template not found', 404);
      }

      await prisma.emailTemplate.delete({
        where: { id: templateId },
      });

      return ResponseBuilder.success(c, null, 'Template deleted successfully');
    } catch (error) {
      logger.error('Failed to delete template:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to delete template',
        500
      );
    }
  }

  /**
   * Render React email preview
   * POST /api/v1/email/render
   */
  async renderReactEmail(c: Context) {
    try {
      const body = await c.req.json<RenderReactEmailInput>();

      let componentCode: string;

      if (body.templateId) {
        const template = await prisma.emailTemplate.findUnique({
          where: { id: body.templateId },
        });

        if (!template || !template.reactTemplate) {
          return ResponseBuilder.error(c, 'React template not found', 404);
        }

        componentCode = template.reactTemplate;
      } else if (body.reactComponent) {
        componentCode = body.reactComponent;
      } else {
        return ResponseBuilder.error(c, 'Template ID or component code required', 400);
      }

      const html = await reactEmailService.renderReactEmail(
        componentCode,
        body.props || {}
      );

      return ResponseBuilder.success(c, { html });
    } catch (error) {
      logger.error('Failed to render React email:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to render email',
        500
      );
    }
  }

  /**
   * Validate email addresses
   * POST /api/v1/email/validate
   */
  async validateEmails(c: Context) {
    try {
      const { emails } = await c.req.json<{ emails: string[] }>();

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return ResponseBuilder.error(c, 'Invalid email list', 400);
      }

      const results = await emailValidationService.validateRecipients(emails);

      return ResponseBuilder.success(c, { results });
    } catch (error) {
      logger.error('Failed to validate emails:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to validate emails',
        500
      );
    }
  }

  /**
   * Get SMTP credentials
   * GET /api/v1/email/smtp/credentials
   */
  async getSmtpCredentials(c: Context) {
    try {
      const accountId = c.get('accountId');
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true, slug: true },
      });

      if (!account) {
        return ResponseBuilder.error(c, 'Account not found', 404);
      }

      // Generate SMTP credentials
      const credentials = {
        host: 'smtp.africommunications.io',
        port: 587,
        secure: false,
        username: `${account.slug}@africommunications.io`,
        // In production, this should be a generated password stored securely
        password: '****** (Use API key as password)',
      };

      return ResponseBuilder.success(c, credentials);
    } catch (error) {
      logger.error('Failed to get SMTP credentials:', error);
      return ResponseBuilder.error(
        c,
        error instanceof Error ? error.message : 'Failed to get SMTP credentials',
        500
      );
    }
  }
}

export const emailController = new EmailController();