// src/app/routes/v1/index.ts

import { Hono } from 'hono';
import { ResponseBuilder } from '@utils/api-response';
import smsRouter from '@modules/sms/routes/sms.routes';
import verifyRouter from '@modules/verify/routes/verify.routes';
import emailRouter from '@modules/email/routes/email.routes';

const v1Router = new Hono();

// API v1 info
v1Router.get('/', (c) => {
  return ResponseBuilder.success(c, {
    version: 'v1',
    status: 'active',
    endpoints: {
      sms: {
        send: 'POST /api/v1/sms/send',
        bulk: 'POST /api/v1/sms/bulk/send',
        list: 'GET /api/v1/sms',
        status: 'GET /api/v1/sms/:id/status',
        analytics: 'GET /api/v1/sms/analytics/overview',
      },
      verify: {
        request: 'POST /api/v1/verify/otp/request',
        verify: 'POST /api/v1/verify/otp/verify',
        resend: 'POST /api/v1/verify/otp/resend',
        status: 'GET /api/v1/verify/otp/status',
        analytics: 'GET /api/v1/verify/otp/analytics',
      },
      email: {
        send: 'POST /api/v1/email/send',
        bulk: 'POST /api/v1/email/bulk/send',
        list: 'GET /api/v1/email',
        status: 'GET /api/v1/email/:id/status',
        analytics: 'GET /api/v1/email/analytics',
        templates: {
          create: 'POST /api/v1/email/templates',
          list: 'GET /api/v1/email/templates',
          get: 'GET /api/v1/email/templates/:id',
          update: 'PUT /api/v1/email/templates/:id',
          delete: 'DELETE /api/v1/email/templates/:id',
        },
        render: 'POST /api/v1/email/render',
        validate: 'POST /api/v1/email/validate',
        smtp: 'GET /api/v1/email/smtp/credentials',
      },
      voice: '/api/v1/voice',
      whatsapp: '/api/v1/whatsapp',
      push: '/api/v1/push',
      lookup: '/api/v1/lookup',
      chat: '/api/v1/chat',
      billing: '/api/v1/billing',
    },
    documentation: '/docs',
  }, 'AfriCom API v1');
});

// Health endpoint for v1
v1Router.get('/health', async (c) => {
  return ResponseBuilder.success(c, {
    status: 'healthy',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// MODULE ROUTES
// ============================================

// SMS routes
v1Router.route('/sms', smsRouter);

// Verify/OTP routes
v1Router.route('/verify', verifyRouter);

// Email routes
v1Router.route('/email', emailRouter);



// v1Router.route('/billing', billingRouter);

export default v1Router;