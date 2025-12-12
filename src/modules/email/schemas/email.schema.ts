// src/modules/email/schemas/email.schema.ts

import { z } from 'zod';

// Email address schema
const emailAddressSchema = z.union([
  z.string().email('Invalid email address'),
  z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().optional(),
  }),
]);

// Attachment schema
const attachmentSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  content: z.union([z.string(), z.instanceof(Buffer)]),
  contentType: z.string().optional(),
  encoding: z.enum(['base64', 'utf8']).optional(),
  cid: z.string().optional(),
});

// Headers schema
const headersSchema = z.record(z.string());

// Send single email schema
export const sendEmailSchema = z.object({
  from: emailAddressSchema,
  to: z.array(emailAddressSchema).min(1, 'At least one recipient is required'),
  cc: z.array(emailAddressSchema).optional(),
  bcc: z.array(emailAddressSchema).optional(),
  replyTo: emailAddressSchema.optional(),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject is too long'),
  html: z.string().optional(),
  text: z.string().optional(),
  templateId: z.string().optional(),
  templateData: z.record(z.any()).optional(),
  attachments: z.array(attachmentSchema).optional(),
  headers: headersSchema.optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
  metadata: z.record(z.any()).optional(),
  scheduledFor: z.union([z.string().datetime(), z.date()]).optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
}).refine(
  (data) => data.html || data.text || data.templateId,
  {
    message: 'Either html, text, or templateId must be provided',
  }
);

// Bulk email schema
export const bulkEmailSchema = z.object({
  from: emailAddressSchema,
  recipients: z.array(
    z.object({
      to: z.array(emailAddressSchema).min(1, 'At least one recipient is required'),
      cc: z.array(emailAddressSchema).optional(),
      bcc: z.array(emailAddressSchema).optional(),
      templateData: z.record(z.any()).optional(),
    })
  ).min(1, 'At least one recipient group is required').max(1000, 'Maximum 1000 recipients per batch'),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject is too long'),
  html: z.string().optional(),
  text: z.string().optional(),
  templateId: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
  headers: headersSchema.optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
  metadata: z.record(z.any()).optional(),
  scheduledFor: z.union([z.string().datetime(), z.date()]).optional(),
  batchSize: z.number().min(1).max(100).optional(),
}).refine(
  (data) => data.html || data.text || data.templateId,
  {
    message: 'Either html, text, or templateId must be provided',
  }
);

// Email status schema
export const emailStatusParamsSchema = z.object({
  id: z.string().cuid('Invalid email ID'),
});

// Email list query schema
export const emailListQuerySchema = z.object({
  status: z.enum(['pending', 'sent', 'delivered', 'bounced', 'complained', 'opened', 'clicked', 'failed']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  tags: z.string().optional(),
});

// Email analytics query schema
export const emailAnalyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
});

// Email template schema
export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Name is too long'),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject is too long'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  variables: z.array(z.string()).optional(),
  category: z.string().default('transactional'),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
  reactTemplate: z.string().optional(),
});

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial();

// Domain verification schema
export const addDomainSchema = z.object({
  domain: z.string()
    .min(1, 'Domain is required')
    .regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i, 'Invalid domain format'),
});

export const verifyDomainSchema = z.object({
  domainId: z.string().cuid('Invalid domain ID'),
});

// React Email render schema
export const renderReactEmailSchema = z.object({
  templateId: z.string().cuid('Invalid template ID').optional(),
  reactComponent: z.string().optional(),
  props: z.record(z.any()).optional(),
}).refine(
  (data) => data.templateId || data.reactComponent,
  {
    message: 'Either templateId or reactComponent must be provided',
  }
);

// Webhook configuration schema
export const emailWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.enum(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed'])).min(1, 'At least one event is required'),
  secret: z.string().optional(),
});

// SMTP credentials schema
export const smtpCredentialsSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type BulkEmailInput = z.infer<typeof bulkEmailSchema>;
export type EmailStatusParams = z.infer<typeof emailStatusParamsSchema>;
export type EmailListQuery = z.infer<typeof emailListQuerySchema>;
export type EmailAnalyticsQuery = z.infer<typeof emailAnalyticsQuerySchema>;
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
export type AddDomainInput = z.infer<typeof addDomainSchema>;
export type VerifyDomainInput = z.infer<typeof verifyDomainSchema>;
export type RenderReactEmailInput = z.infer<typeof renderReactEmailSchema>;
export type EmailWebhookInput = z.infer<typeof emailWebhookSchema>;
export type SMTPCredentialsInput = z.infer<typeof smtpCredentialsSchema>;