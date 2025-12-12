// src/modules/email/types/email.types.ts

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: 'base64' | 'utf8';
  cid?: string; // Content-ID for inline images
}

export interface EmailHeaders {
  [key: string]: string;
}

export interface SendEmailRequest {
  from: EmailAddress | string;
  to: EmailAddress[] | string[];
  cc?: EmailAddress[] | string[];
  bcc?: EmailAddress[] | string[];
  replyTo?: EmailAddress | string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: EmailAttachment[];
  headers?: EmailHeaders;
  tags?: string[];
  metadata?: Record<string, any>;
  scheduledFor?: Date | string;
  priority?: 'high' | 'normal' | 'low';
}

export interface BulkEmailRequest {
  from: EmailAddress | string;
  recipients: Array<{
    to: EmailAddress[] | string[];
    cc?: EmailAddress[] | string[];
    bcc?: EmailAddress[] | string[];
    templateData?: Record<string, any>;
  }>;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  attachments?: EmailAttachment[];
  headers?: EmailHeaders;
  tags?: string[];
  metadata?: Record<string, any>;
  scheduledFor?: Date | string;
  batchSize?: number;
}

export interface EmailResponse {
  id: string;
  status: string;
  to: string[];
  from: string;
  subject: string;
  createdAt: Date;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export interface BulkEmailResponse {
  batchId: string;
  totalEmails: number;
  queued: number;
  failed: number;
  emails: EmailResponse[];
}

export interface EmailStatusResponse {
  id: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked' | 'failed';
  to: string[];
  from: string;
  subject: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bounceType?: string;
  complaintType?: string;
  error?: string;
  events: EmailEvent[];
}

export interface EmailEvent {
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface EmailAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalOpened: number;
  totalClicked: number;
  totalComplained: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  complaintRate: number;
}

export interface SMTPCredentials {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface EmailDomain {
  id: string;
  accountId: string;
  domain: string;
  isVerified: boolean;
  verificationToken: string;
  dkimSelector: string;
  dkimPrivateKey: string;
  dkimPublicKey: string;
  spfRecord: string;
  dmarcRecord: string;
  mxRecords: string[];
  createdAt: Date;
  verifiedAt?: Date;
}

export interface DomainVerificationRecords {
  spf: {
    type: 'TXT';
    name: string;
    value: string;
  };
  dkim: {
    type: 'TXT';
    name: string;
    value: string;
  };
  dmarc: {
    type: 'TXT';
    name: string;
    value: string;
  };
  mx: Array<{
    type: 'MX';
    name: string;
    value: string;
    priority: number;
  }>;
  verification: {
    type: 'TXT';
    name: string;
    value: string;
  };
}

export interface EmailTemplate {
  id: string;
  accountId: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  category: string;
  isActive: boolean;
  reactTemplate?: string; // React Email component code
}

export interface ReactEmailProps {
  [key: string]: any;
}

export interface EmailQueueJob {
  id: string;
  accountId: string;
  emailData: SendEmailRequest;
  attempts: number;
  maxAttempts: number;
  scheduledFor?: Date;
  createdAt: Date;
}

export interface SMTPSession {
  sessionId: string;
  from: string;
  to: string[];
  data: string;
  authenticated: boolean;
  accountId?: string;
  apiKeyId?: string;
}

export interface BounceClassification {
  type: 'hard' | 'soft' | 'undetermined';
  category: 'mailbox-full' | 'invalid-recipient' | 'spam' | 'blocked' | 'technical' | 'other';
  description: string;
  isPermanent: boolean;
}