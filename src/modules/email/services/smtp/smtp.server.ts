// src/core/services/smtp/smtp.server.ts

import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { logger } from '@utils/logger';
import { prisma } from '@core/database/prisma.client';
import { config } from '@core/config';
import { createHash } from 'crypto';

export class InboundSMTPServer {
  private server: SMTPServer | null = null;

  /**
   * Start SMTP server for receiving emails
   */
  start(): void {
    this.server = new SMTPServer({
      name: 'africommunications.io',
      banner: 'AfriCom SMTP Server',
      
      // Authentication
      authOptional: false,
      
      onAuth: async (auth, session, callback) => {
        try {
          // Authenticate using API key as password
          const apiKey = await this.validateApiKey(auth.username, auth.password);
          
          if (!apiKey) {
            return callback(new Error('Invalid credentials'));
          }

          // Store account ID in session
          (session as any).accountId = apiKey.accountId;
          (session as any).apiKeyId = apiKey.id;
          
          callback(null, { user: auth.username });
        } catch (error) {
          logger.error('SMTP auth error:', error);
          callback(new Error('Authentication failed'));
        }
      },

      // Handle incoming email
      onData: async (stream, session, callback) => {
        try {
          const accountId = (session as any).accountId;

          if (!accountId) {
            return callback(new Error('No account ID in session'));
          }

          // Parse email
          const parsed = await simpleParser(stream);

          // Extract email details
          const from = typeof parsed.from?.value[0] === 'object' 
            ? parsed.from.value[0].address 
            : '';
          
          const to = parsed.to?.value.map(addr => 
            typeof addr === 'object' ? addr.address : ''
          ) || [];

          const cc = parsed.cc?.value.map(addr => 
            typeof addr === 'object' ? addr.address : ''
          ) || [];

          const bcc = parsed.bcc?.value.map(addr => 
            typeof addr === 'object' ? addr.address : ''
          ) || [];

          // Store email in database
          const email = await prisma.emailMessage.create({
            data: {
              accountId,
              to: to.join(','),
              cc: cc.length > 0 ? cc.join(',') : undefined,
              bcc: bcc.length > 0 ? bcc.join(',') : undefined,
              subject: parsed.subject || '',
              htmlContent: parsed.html || undefined,
              textContent: parsed.text || undefined,
              status: 'PENDING',
              metadata: {
                from,
                messageId: parsed.messageId,
                date: parsed.date,
                headers: parsed.headers,
                attachments: parsed.attachments?.map(att => ({
                  filename: att.filename,
                  contentType: att.contentType,
                  size: att.size,
                })),
              } as any,
            },
          });

          // Process attachments if any
          if (parsed.attachments && parsed.attachments.length > 0) {
            // In production, upload attachments to S3 or similar storage
            logger.info(`Email ${email.id} has ${parsed.attachments.length} attachments`);
          }

          logger.info(`Email received via SMTP: ${email.id}`, {
            accountId,
            from,
            to: to.length,
          });

          callback(null, 'Message accepted');
        } catch (error) {
          logger.error('Error processing SMTP email:', error);
          callback(new Error('Failed to process email'));
        }
      },

      // Connection limits
      maxClients: 100,
      
      // Message size limit (10MB)
      size: 10 * 1024 * 1024,
      
      // Require secure connection
      secure: false,
      disabledCommands: ['STARTTLS'],
      
      // Logging
      logger: false,
      
      onConnect: (session, callback) => {
        logger.debug('SMTP client connected', {
          remoteAddress: session.remoteAddress,
        });
        callback();
      },

      onClose: (session) => {
        logger.debug('SMTP client disconnected', {
          remoteAddress: session.remoteAddress,
        });
      },
    });

    // Start listening
    const port = config.smtp.inboundPort || 2525;
    
    this.server.listen(port, () => {
      logger.info(`Inbound SMTP server listening on port ${port}`);
    });

    // Error handling
    this.server.on('error', (error) => {
      logger.error('SMTP server error:', error);
    });
  }

  /**
   * Validate API key for SMTP auth
   */
  private async validateApiKey(
    username: string,
    password: string
  ): Promise<{ id: string; accountId: string } | null> {
    try {
      // Hash the provided password (API key)
      const hashedKey = createHash('sha256').update(password).digest('hex');

      // Find API key
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          key: password,
          isActive: true,
        },
        select: {
          id: true,
          accountId: true,
          permissions: true,
        },
      });

      if (!apiKey) {
        return null;
      }

      // Check if API key has email permissions
      if (!apiKey.permissions.includes('email:send')) {
        logger.warn('API key does not have email:send permission');
        return null;
      }

      // Update last used
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: {
          lastUsedAt: new Date(),
          totalRequests: { increment: 1 },
        },
      });

      return {
        id: apiKey.id,
        accountId: apiKey.accountId,
      };
    } catch (error) {
      logger.error('Error validating API key:', error);
      return null;
    }
  }

  /**
   * Stop SMTP server
   */
  stop(): void {
    if (this.server) {
      this.server.close(() => {
        logger.info('Inbound SMTP server stopped');
      });
    }
  }
}

export const inboundSMTPServer = new InboundSMTPServer();