// src/core/services/smtp/smtp.service.ts

import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import { logger } from '@utils/logger';
import { EmailAddress, EmailAttachment } from '@modules/email/types/email.types';
import { config } from '@core/config';
import dns from 'dns/promises';
import { createHash, randomBytes } from 'crypto';

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  dkim?: {
    domainName: string;
    keySelector: string;
    privateKey: string;
  };
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
}

export class SMTPService {
  private transporter: Transporter | null = null;
  private poolTransporter: Transporter | null = null;
  private readonly defaultConfig: SMTPConfig;

  constructor() {
    this.defaultConfig = {
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth ? {
        user: config.smtp.auth.user,
        pass: config.smtp.auth.pass,
      } : undefined,
    };
  }

  /**
   * Initialize SMTP transporter
   */
  async initialize(): Promise<void> {
    try {
      // Create single connection transporter
      this.transporter = nodemailer.createTransport({
        ...this.defaultConfig,
        pool: false,
      });

      // Create pooled transporter for high volume
      this.poolTransporter = nodemailer.createTransport({
        ...this.defaultConfig,
        pool: true,
        maxConnections: 10,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 10,
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
    } catch (error) {
      logger.error('Failed to initialize SMTP service:', error);
      throw new Error('SMTP service initialization failed');
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(options: {
    from: EmailAddress | string;
    to: (EmailAddress | string)[];
    cc?: (EmailAddress | string)[];
    bcc?: (EmailAddress | string)[];
    replyTo?: EmailAddress | string;
    subject: string;
    html?: string;
    text?: string;
    attachments?: EmailAttachment[];
    headers?: Record<string, string>;
    messageId?: string;
    dkim?: {
      domainName: string;
      keySelector: string;
      privateKey: string;
    };
  }): Promise<{
    messageId: string;
    accepted: string[];
    rejected: string[];
    response: string;
  }> {
    if (!this.transporter) {
      throw new Error('SMTP service not initialized');
    }

    try {
      const mailOptions: SendMailOptions = {
        from: this.formatAddress(options.from),
        to: options.to.map(addr => this.formatAddress(addr)),
        cc: options.cc?.map(addr => this.formatAddress(addr)),
        bcc: options.bcc?.map(addr => this.formatAddress(addr)),
        replyTo: options.replyTo ? this.formatAddress(options.replyTo) : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding as any,
          cid: att.cid,
        })),
        headers: options.headers,
        messageId: options.messageId || this.generateMessageId(options.from),
      };

      // Add DKIM if provided
      if (options.dkim) {
        (mailOptions as any).dkim = options.dkim;
      }

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      });

      return {
        messageId: info.messageId,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
        response: info.response,
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send bulk emails using connection pool
   */
  async sendBulkEmails(emails: Array<{
    from: EmailAddress | string;
    to: (EmailAddress | string)[];
    cc?: (EmailAddress | string)[];
    bcc?: (EmailAddress | string)[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: EmailAttachment[];
  }>): Promise<Array<{
    success: boolean;
    messageId?: string;
    error?: string;
    recipient: string;
  }>> {
    if (!this.poolTransporter) {
      throw new Error('SMTP pool not initialized');
    }

    const results: Array<{
      success: boolean;
      messageId?: string;
      error?: string;
      recipient: string;
    }> = [];

    for (const email of emails) {
      try {
        const info = await this.poolTransporter.sendMail({
          from: this.formatAddress(email.from),
          to: email.to.map(addr => this.formatAddress(addr)),
          cc: email.cc?.map(addr => this.formatAddress(addr)),
          bcc: email.bcc?.map(addr => this.formatAddress(addr)),
          subject: email.subject,
          html: email.html,
          text: email.text,
          attachments: email.attachments?.map(att => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
            encoding: att.encoding as any,
            cid: att.cid,
          })),
        });

        results.push({
          success: true,
          messageId: info.messageId,
          recipient: Array.isArray(email.to) ? email.to[0].toString() : email.to.toString(),
        });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          recipient: Array.isArray(email.to) ? email.to[0].toString() : email.to.toString(),
        });
      }
    }

    return results;
  }

  /**
   * Verify email address format and domain MX records
   */
  async verifyEmailAddress(email: string): Promise<{
    valid: boolean;
    formatValid: boolean;
    domainExists: boolean;
    mxRecords?: string[];
  }> {
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const formatValid = emailRegex.test(email);

    if (!formatValid) {
      return { valid: false, formatValid: false, domainExists: false };
    }

    // Extract domain
    const domain = email.split('@')[1];

    try {
      // Check MX records
      const mxRecords = await dns.resolveMx(domain);
      const domainExists = mxRecords.length > 0;
      
      return {
        valid: formatValid && domainExists,
        formatValid,
        domainExists,
        mxRecords: mxRecords.map(r => r.exchange),
      };
    } catch (error) {
      return {
        valid: false,
        formatValid,
        domainExists: false,
      };
    }
  }

  /**
   * Generate DKIM keys for a domain
   */
  generateDKIMKeys(): {
    privateKey: string;
    publicKey: string;
    selector: string;
  } {
    const { generateKeyPairSync } = require('crypto');
    
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const selector = `africom-${Date.now()}`;

    return {
      privateKey,
      publicKey,
      selector,
    };
  }

  /**
   * Generate SPF record for a domain
   */
  generateSPFRecord(domain: string, ipAddresses: string[] = []): string {
    const ips = ipAddresses.map(ip => `ip4:${ip}`).join(' ');
    return `v=spf1 ${ips} include:${domain} ~all`;
  }

  /**
   * Generate DMARC record for a domain
   */
  generateDMARCRecord(reportEmail: string): string {
    return `v=DMARC1; p=quarantine; rua=mailto:${reportEmail}; ruf=mailto:${reportEmail}; fo=1; pct=100`;
  }

  /**
   * Check if domain has proper email authentication setup
   */
  async checkDomainAuthentication(domain: string): Promise<{
    spf: { exists: boolean; record?: string };
    dkim: { exists: boolean; record?: string };
    dmarc: { exists: boolean; record?: string };
    mx: { exists: boolean; records?: string[] };
  }> {
    const results = {
      spf: { exists: false },
      dkim: { exists: false },
      dmarc: { exists: false },
      mx: { exists: false },
    };

    try {
      // Check SPF
      const spfRecords = await dns.resolveTxt(domain);
      const spfRecord = spfRecords.flat().find(r => r.startsWith('v=spf1'));
      if (spfRecord) {
        results.spf = { exists: true, record: spfRecord };
      }
    } catch (error) {
      // SPF not found
    }

    try {
      // Check DMARC
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
      const dmarcRecord = dmarcRecords.flat().find(r => r.startsWith('v=DMARC1'));
      if (dmarcRecord) {
        results.dmarc = { exists: true, record: dmarcRecord };
      }
    } catch (error) {
      // DMARC not found
    }

    try {
      // Check MX
      const mxRecords = await dns.resolveMx(domain);
      if (mxRecords.length > 0) {
        results.mx = {
          exists: true,
          records: mxRecords.map(r => r.exchange),
        };
      }
    } catch (error) {
      // MX not found
    }

    return results;
  }

  /**
   * Format email address
   */
  private formatAddress(address: EmailAddress | string): string {
    if (typeof address === 'string') {
      return address;
    }
    return address.name ? `"${address.name}" <${address.email}>` : address.email;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(from: EmailAddress | string): string {
    const domain = typeof from === 'string' 
      ? from.split('@')[1] 
      : from.email.split('@')[1];
    
    const randomPart = randomBytes(16).toString('hex');
    return `<${randomPart}@${domain}>`;
  }

  /**
   * Close SMTP connections
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
    }
    if (this.poolTransporter) {
      this.poolTransporter.close();
    }
    logger.info('SMTP connections closed');
  }
}

export const smtpService = new SMTPService();