import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { ResponseBuilder } from '@utils/api-response';
import { logger } from '@utils/logger';
import prisma from '@database/prisma.client';

// Token-based authentication middleware (Bearer token)
export const tokenAuth = createMiddleware(async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    logger.warn({ path: c.req.path }, 'Authorization header missing');
    return ResponseBuilder.unauthorized(c, 'Authorization header is required');
  }

  // Extract token from "Bearer <token>" format
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) {
    logger.warn({ header: authHeader.substring(0, 20) }, 'Invalid Authorization header format');
    return ResponseBuilder.unauthorized(c, 'Invalid Authorization header format. Expected: Bearer <token>');
  }

  const token = match[1];

  try {
    // Decode the base64 token to get key and secret
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [key, secret] = decoded.split(':');

    if (!key || !secret) {
      logger.warn({ token: token.substring(0, 10) }, 'Invalid token format');
      return ResponseBuilder.unauthorized(c, 'Invalid token format');
    }

    // Find API key in database
    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
      include: {
        account: {
          select: {
            id: true,
            status: true,
            walletBalance: true,
            creditBalance: true,
            type: true,
            isPersonal: true,
            country: true,
            currency: true,
          },
        },
      },
    });

    if (!apiKey) {
      logger.warn({ key: key.substring(0, 10) }, 'API key not found');
      return ResponseBuilder.unauthorized(c, 'Invalid token');
    }

    // Verify secret (in production, you should hash and compare)
    // For now, we'll assume the token contains the actual secret
    // In a real implementation, you would hash the secret and compare
    if (secret !== apiKey.secretHash) {
      // Note: In production, use proper hashing like bcrypt
      logger.warn({ keyId: apiKey.id }, 'Invalid secret');
      return ResponseBuilder.unauthorized(c, 'Invalid token');
    }

    // Check if key is active
    if (!apiKey.isActive) {
      logger.warn({ keyId: apiKey.id }, 'API key is inactive');
      return ResponseBuilder.unauthorized(c, 'Token is inactive');
    }

    // Check if key has expired
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      logger.warn({ keyId: apiKey.id, expiresAt: apiKey.expiresAt }, 'API key has expired');
      return ResponseBuilder.unauthorized(c, 'Token has expired');
    }

    // Check account status
    if (apiKey.account.status !== 'ACTIVE') {
      logger.warn({ 
        accountId: apiKey.accountId, 
        status: apiKey.account.status 
      }, 'Account is not active');
      return ResponseBuilder.forbidden(c, 'Account is not active');
    }

    // Check IP whitelist if configured
    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
      const clientIp = c.req.header('x-forwarded-for')?.split(',')[0] || 
                       c.req.header('x-real-ip') || 
                       'unknown';
      
      if (!apiKey.ipWhitelist.includes(clientIp)) {
        logger.warn({ 
          keyId: apiKey.id, 
          clientIp, 
          whitelist: apiKey.ipWhitelist 
        }, 'IP not in whitelist');
        return ResponseBuilder.forbidden(c, 'IP address not allowed');
      }
    }

    // Update last used timestamp (async, don't await)
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        totalRequests: { increment: 1 },
      },
    }).catch((error: any) => {
      logger.error({ error, keyId: apiKey.id }, 'Failed to update API key usage');
    });

    // Set account and key info in context
    c.set('apiKey', apiKey);
    c.set('account', apiKey.account);
    c.set('accountId', apiKey.accountId);

    await next();
  } catch (error) {
    logger.error({ 
      error, 
      path: c.req.path,
      token: token.substring(0, 20) 
    }, 'Token authentication error');
    return ResponseBuilder.unauthorized(c, 'Invalid or expired token');
  }
});

// Token generation endpoint handler
export const generateToken = async (key: string, secret: string): Promise<{
  token: string;
  expiresAt: Date;
  tokenType: string;
}> => {
  // Find the API key
  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: { account: true },
  });

  if (!apiKey || !apiKey.isActive) {
    throw new Error('Invalid API key');
  }

  // Verify secret (in production, use proper hashing)
  if (secret !== apiKey.secretHash) {
    throw new Error('Invalid secret');
  }

  // Create token: base64(key:secret)
  const token = Buffer.from(`${key}:${secret}`).toString('base64');
  
  // Calculate expiration
  const expiresAt = apiKey.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

  return {
    token,
    expiresAt,
    tokenType: 'Bearer',
  };
};

// Token validation endpoint handler
export const validateToken = async (token: string): Promise<{
  valid: boolean;
  accountId?: string;
  message?: string;
}> => {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [key, secret] = decoded.split(':');

    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
      include: { account: true },
    });

    if (!apiKey || !apiKey.isActive) {
      return { valid: false, message: 'Token is invalid or inactive' };
    }

    if (secret !== apiKey.secretHash) {
      return { valid: false, message: 'Invalid token' };
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { valid: false, message: 'Token has expired' };
    }

    if (apiKey.account.status !== 'ACTIVE') {
      return { valid: false, message: 'Account is not active' };
    }

    return { 
      valid: true, 
      accountId: apiKey.accountId,
      message: 'Token is active' 
    };
  } catch (error) {
    return { valid: false, message: 'Invalid token format' };
  }
};

// Scoped token middleware (for future implementation)
export const requireScope = (...scopes: string[]) => {
  return createMiddleware(async (c: Context, next: Next) => {
    const apiKey = c.get('apiKey');
    
    if (!apiKey) {
      return ResponseBuilder.unauthorized(c, 'Authentication required');
    }

    // TODO: Implement scope checking when scopes are added to API keys
    // For now, all tokens have full access
    logger.debug({ 
      keyId: apiKey.id, 
      requiredScopes: scopes 
    }, 'Scope check (not yet implemented)');

    await next();
  });
};

// Token revocation handler
export const revokeToken = async (keyId: string): Promise<boolean> => {
  try {
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });
    return true;
  } catch (error) {
    logger.error({ error, keyId }, 'Failed to revoke token');
    return false;
  }
};