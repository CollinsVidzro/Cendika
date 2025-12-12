// src/modules/email/services/email-validation.service.ts

import dns from 'dns/promises';
import { logger } from '@utils/logger';

interface EmailValidationResult {
  email: string;
  valid: boolean;
  formatValid: boolean;
  domainExists: boolean;
  mxRecords?: string[];
  disposable?: boolean;
  reason?: string;
}

export class EmailValidationService {
  private disposableDomains: Set<string> = new Set([
    'tempmail.com',
    'throwaway.email',
    'guerrillamail.com',
    '10minutemail.com',
    'mailinator.com',
    'maildrop.cc',
    'temp-mail.org',
    // Add more as needed
  ]);

  /**
   * Validate a single email address
   */
  async validateEmail(email: string): Promise<EmailValidationResult> {
    const result: EmailValidationResult = {
      email,
      valid: false,
      formatValid: false,
      domainExists: false,
    };

    // Check format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    result.formatValid = emailRegex.test(email);

    if (!result.formatValid) {
      result.reason = 'Invalid email format';
      return result;
    }

    // Extract domain
    const domain = email.split('@')[1].toLowerCase();

    // Check if disposable
    result.disposable = this.disposableDomains.has(domain);
    if (result.disposable) {
      result.reason = 'Disposable email address';
      return result;
    }

    // Check domain MX records
    try {
      const mxRecords = await dns.resolveMx(domain);
      result.domainExists = mxRecords.length > 0;
      result.mxRecords = mxRecords.map(r => r.exchange);

      if (!result.domainExists) {
        result.reason = 'Domain has no MX records';
        return result;
      }

      result.valid = true;
    } catch (error) {
      result.reason = 'Domain does not exist or has no MX records';
      logger.debug(`MX lookup failed for ${domain}:`, error);
    }

    return result;
  }

  /**
   * Validate multiple email addresses
   */
  async validateRecipients(emails: string[]): Promise<EmailValidationResult[]> {
    const results = await Promise.all(
      emails.map(email => this.validateEmail(email))
    );
    return results;
  }

  /**
   * Validate email domain exists
   */
  async validateDomain(domain: string): Promise<{
    valid: boolean;
    mxRecords?: string[];
    hasSpf: boolean;
    hasDmarc: boolean;
  }> {
    const result = {
      valid: false,
      hasSpf: false,
      hasDmarc: false,
    };

    try {
      // Check MX records
      const mxRecords = await dns.resolveMx(domain);
      result.valid = mxRecords.length > 0;
      (result as any).mxRecords = mxRecords.map(r => r.exchange);

      // Check SPF record
      try {
        const txtRecords = await dns.resolveTxt(domain);
        result.hasSpf = txtRecords.flat().some(record => record.startsWith('v=spf1'));
      } catch {
        // No SPF record
      }

      // Check DMARC record
      try {
        const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
        result.hasDmarc = dmarcRecords.flat().some(record => record.startsWith('v=DMARC1'));
      } catch {
        // No DMARC record
      }
    } catch (error) {
      logger.debug(`Domain validation failed for ${domain}:`, error);
    }

    return result;
  }

  /**
   * Check if email is from a free provider
   */
  isFreeProvider(email: string): boolean {
    const domain = email.split('@')[1].toLowerCase();
    const freeProviders = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'live.com',
      'aol.com',
      'icloud.com',
      'mail.com',
      'protonmail.com',
      'zoho.com',
    ];
    return freeProviders.includes(domain);
  }

  /**
   * Normalize email address
   */
  normalizeEmail(email: string): string {
    const [local, domain] = email.toLowerCase().split('@');
    
    // Remove dots from Gmail addresses (they're ignored)
    if (domain === 'gmail.com') {
      return local.replace(/\./g, '') + '@' + domain;
    }

    // Remove everything after + (plus addressing)
    const localWithoutPlus = local.split('+')[0];
    
    return localWithoutPlus + '@' + domain;
  }

  /**
   * Extract name from email address
   */
  extractNameFromEmail(email: string): string {
    const local = email.split('@')[0];
    
    // Replace common separators with spaces
    const name = local
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return name;
  }

  /**
   * Check if email matches pattern
   */
  matchesPattern(email: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(email);
  }

  /**
   * Add domain to disposable list
   */
  addDisposableDomain(domain: string): void {
    this.disposableDomains.add(domain.toLowerCase());
  }

  /**
   * Remove domain from disposable list
   */
  removeDisposableDomain(domain: string): void {
    this.disposableDomains.delete(domain.toLowerCase());
  }

  /**
   * Batch validate emails with rate limiting
   */
  async batchValidate(
    emails: string[],
    options: {
      concurrency?: number;
      skipDnsCheck?: boolean;
    } = {}
  ): Promise<EmailValidationResult[]> {
    const { concurrency = 10, skipDnsCheck = false } = options;
    const results: EmailValidationResult[] = [];

    // Process in batches
    for (let i = 0; i < emails.length; i += concurrency) {
      const batch = emails.slice(i, i + concurrency);
      
      const batchResults = await Promise.all(
        batch.map(async email => {
          if (skipDnsCheck) {
            return {
              email,
              valid: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email),
              formatValid: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email),
              domainExists: false,
            };
          }
          return this.validateEmail(email);
        })
      );

      results.push(...batchResults);

      // Small delay between batches to avoid overwhelming DNS servers
      if (i + concurrency < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}

export const emailValidationService = new EmailValidationService();