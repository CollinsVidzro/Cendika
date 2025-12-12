// src/modules/email/routes/email.routes.ts

import { Hono } from 'hono';
import { emailController } from '../controllers/email.controller';
import {
  apiKeyAuth,
  emailRateLimit,
  requirePermissions,
  validate,
  checkBalance,
  checkLimits,
  deductBalance,
  auditLogger,
  validateBulkRequest,
} from '@app/middleware';
import {
  sendEmailSchema,
  bulkEmailSchema,
  emailStatusParamsSchema,
  emailListQuerySchema,
  emailAnalyticsQuerySchema,
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  renderReactEmailSchema,
} from '../schemas/email.schema';
import type { Context } from 'hono';

const emailRouter = new Hono();

// Apply authentication to all routes
emailRouter.use('*', apiKeyAuth);

// Apply email rate limiting
emailRouter.use('*', emailRateLimit);

// ============================================
// EMAIL SENDING ROUTES
// ============================================

// Send single email
emailRouter.post(
  '/send',
  requirePermissions('email:send'),
  validate('json', sendEmailSchema),
  checkLimits('email'),
  checkBalance(async (c: Context) => {
    const body = await c.req.json();
    
    // Calculate cost based on recipients and attachments
    const recipients = [
      body.to,
      ...(body.cc || []),
      ...(body.bcc || [])
    ].filter(Boolean);
    
    const recipientCount = new Set(recipients).size; // Deduplicate
    
    // Simple cost estimation: base cost per recipient
    const baseCostPerRecipient = 0.05; // 0.05 GHS per recipient
    
    return {
      estimatedCost: baseCostPerRecipient * recipientCount,
      currency: 'GHS',
    };
  }),
  deductBalance,
  auditLogger('send', 'email'),
  emailController.sendEmail
);

// Send bulk emails
emailRouter.post(
  '/bulk/send',
  requirePermissions('email:send', 'email:bulk'),
  validate('json', bulkEmailSchema),
  checkLimits('email'),
  checkBalance(async (c: Context) => {
    const body = await c.req.json();
    
    // Calculate total recipients across all emails
    let totalRecipients = 0;
    
    for (const email of body.emails) {
      const recipients = [
        email.to,
        ...(email.cc || []),
        ...(email.bcc || [])
      ].filter(Boolean);
      totalRecipients += new Set(recipients).size;
    }
    
    // Bulk discount: 0.03 GHS per recipient
    const bulkCostPerRecipient = 0.03;
    
    return {
      estimatedCost: bulkCostPerRecipient * totalRecipients,
      currency: 'GHS',
    };
  }),
  validateBulkRequest(1000), // Max 1000 emails per bulk request
  deductBalance,
  auditLogger('send_bulk', 'email'),
  emailController.sendBulkEmails
);

// ============================================
// EMAIL MANAGEMENT ROUTES
// ============================================

// List sent emails
emailRouter.get(
  '/',
  validate('query', emailListQuerySchema),
  emailController.listEmails
);

// Get email status
emailRouter.get(
  '/:id/status',
  validate('param', emailStatusParamsSchema),
  emailController.getEmailStatus
);

// Get email analytics
emailRouter.get(
  '/analytics',
  validate('query', emailAnalyticsQuerySchema),
  emailController.getAnalytics
);

// ============================================
// EMAIL TEMPLATE ROUTES
// ============================================

// Create email template
emailRouter.post(
  '/templates',
  requirePermissions('email:templates:manage'),
  validate('json', createEmailTemplateSchema),
  auditLogger('create', 'email_template'),
  emailController.createTemplate
);

// List email templates
emailRouter.get(
  '/templates',
  emailController.listTemplates
);

// Get email template
emailRouter.get(
  '/templates/:id',
  emailController.getTemplate
);

// Update email template
emailRouter.put(
  '/templates/:id',
  requirePermissions('email:templates:manage'),
  validate('json', updateEmailTemplateSchema),
  auditLogger('update', 'email_template'),
  emailController.updateTemplate
);

// Delete email template
emailRouter.delete(
  '/templates/:id',
  requirePermissions('email:templates:manage'),
  auditLogger('delete', 'email_template'),
  emailController.deleteTemplate
);

// ============================================
// REACT EMAIL ROUTES
// ============================================

// Render React email component
emailRouter.post(
  '/render',
  validate('json', renderReactEmailSchema),
  emailController.renderReactEmail
);

// ============================================
// EMAIL VALIDATION ROUTES
// ============================================

// Validate email addresses
emailRouter.post(
  '/validate',
  emailController.validateEmails
);

// ============================================
// SMTP CONFIGURATION ROUTES
// ============================================

// Get SMTP credentials
emailRouter.get(
  '/smtp/credentials',
  requirePermissions('email:smtp:manage'),
  emailController.getSmtpCredentials
);

export default emailRouter;