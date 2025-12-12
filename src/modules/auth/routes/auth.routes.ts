import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '@utils/logger';
import { generateToken, validateToken, revokeToken } from './auth.middleware';
import { ResponseBuilder } from '@utils/api-response';
import prisma from '@database/prisma.client';

const auth = new Hono();

// Schema for token generation
const generateTokenSchema = z.object({
  key: z.string().min(1),
  secret: z.string().min(1),
});

// Generate token endpoint
auth.post('/token', async (c) => {
  try {
    const body = await c.req.json();
    const { key, secret } = generateTokenSchema.parse(body);

    const tokenData = await generateToken(key, secret);

    logger.info({ keyId: key.substring(0, 10) }, 'Token generated');

    return ResponseBuilder.success(c, {
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      tokenType: tokenData.tokenType,
    });
  } catch (error: any) {
    logger.error({ error }, 'Token generation failed');
    return ResponseBuilder.unauthorized(c, error.message || 'Invalid credentials');
  }
});

// Validate token endpoint
auth.get('/token/validate', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    return ResponseBuilder.unauthorized(c, 'Authorization header is required');
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) {
    return ResponseBuilder.unauthorized(c, 'Invalid Authorization header format');
  }

  const token = match[1];
  const validation = await validateToken(token);

  if (!validation.valid) {
    return ResponseBuilder.unauthorized(c, validation.message);
  }

  return ResponseBuilder.success(c, {
    status: 'valid',
    message: validation.message,
    accountId: validation.accountId,
  });
});

// Revoke token endpoint (requires authentication)
auth.post('/token/revoke', async (c) => {
  try {
    const apiKey = c.get('apiKey');
    
    if (!apiKey) {
      return ResponseBuilder.unauthorized(c, 'Authentication required');
    }

    const success = await revokeToken(apiKey.id);

    if (success) {
      logger.info({ keyId: apiKey.id }, 'Token revoked');
      return ResponseBuilder.success(c, { 
        message: 'Token revoked successfully' 
      });
    } else {
      return ResponseBuilder.error(c, 
        'REVOKE_FAILED', 
        'Failed to revoke token', 
        500
      );
    }
  } catch (error: any) {
    logger.error({ error }, 'Token revocation failed');
    return ResponseBuilder.serverError(c, error.message);
  }
});

// List active tokens for account
auth.get('/tokens', async (c) => {
  const account = c.get('account');
  
  if (!account) {
    return ResponseBuilder.unauthorized(c, 'Authentication required');
  }

  try {
    const tokens = await prisma.apiKey.findMany({
      where: { 
        accountId: account.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        key: true,
        expiresAt: true,
        lastUsedAt: true,
        totalRequests: true,
        environment: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask the actual key for security
    const safeTokens = tokens.map(token => ({
      ...token,
      key: `${token.key.substring(0, 8)}...`,
    }));

    return ResponseBuilder.success(c, { tokens: safeTokens });
  } catch (error: any) {
    logger.error({ error, accountId: account.id }, 'Failed to fetch tokens');
    return ResponseBuilder.serverError(c, 'Failed to fetch tokens');
  }
});

export { auth };