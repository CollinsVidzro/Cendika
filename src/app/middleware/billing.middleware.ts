import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { ResponseBuilder } from '@utils/api-response';
import { logger } from '@utils/logger';
import prisma from '@database/prisma.client';
import { env } from '@config/env';

interface CostEstimate {
  estimatedCost: number;
  currency: string;
  units?: number;
}

// Check if account has sufficient balance
export const checkBalance = (getCostEstimate: (c: Context) => Promise<CostEstimate> | CostEstimate) => {
  return createMiddleware(async (c: Context, next: Next) => {
    const account = c.get('account');

    if (!account) {
      return ResponseBuilder.unauthorized(c, 'Authentication required');
    }

    try {
      // Get cost estimate
      const { estimatedCost, currency } = await getCostEstimate(c);

      // Get current balance
      const currentAccount = await prisma.account.findUnique({
        where: { id: account.id },
        select: {
          walletBalance: true,
          creditBalance: true,
          currency: true,
        },
      });

      if (!currentAccount) {
        return ResponseBuilder.error(c, 'ACCOUNT_NOT_FOUND', 'Account not found', 404);
      }

      const totalBalance = currentAccount.walletBalance + currentAccount.creditBalance;

      // Check if balance is sufficient
      if (totalBalance < estimatedCost) {
        logger.warn({
          accountId: account.id,
          balance: totalBalance,
          required: estimatedCost,
          currency,
        }, 'Insufficient balance');

        return ResponseBuilder.insufficientBalance(c, totalBalance, estimatedCost);
      }

      // Check low balance warning threshold
      const remainingBalance = totalBalance - estimatedCost;
      if (remainingBalance <= env.LOW_BALANCE_THRESHOLD) {
        logger.warn({
          accountId: account.id,
          remainingBalance,
          threshold: env.LOW_BALANCE_THRESHOLD,
        }, 'Low balance warning');

        c.header('X-Low-Balance-Warning', 'true');
        c.header('X-Remaining-Balance', remainingBalance.toString());
      }

      // Store cost estimate in context for later use
      c.set('estimatedCost', estimatedCost);
      c.set('costCurrency', currency);

      await next();
    } catch (error) {
      logger.error({ error, accountId: account.id }, 'Balance check error');
      return ResponseBuilder.serverError(c, 'Failed to check balance');
    }
  });
};

// Deduct balance after successful operation
export const deductBalance = createMiddleware(async (c: Context, next: Next) => {
  const account = c.get('account');
  const estimatedCost = c.get('estimatedCost') as number;

  if (!account || !estimatedCost) {
    await next();
    return;
  }

  await next();

  // Only deduct if the request was successful
  if (c.res.status >= 200 && c.res.status < 300) {
    try {
      // Get actual cost from context (set by service)
      const actualCost = c.get('actualCost') as number || estimatedCost;
      const serviceType = c.get('serviceType') as string;

      await deductAccountBalance(account.id, actualCost, serviceType);

      logger.info({
        accountId: account.id,
        amount: actualCost,
        serviceType,
      }, 'Balance deducted');
    } catch (error) {
      logger.error({ 
        error, 
        accountId: account.id, 
        cost: estimatedCost 
      }, 'Failed to deduct balance');
    }
  }
});

// Helper function to deduct balance from account
async function deductAccountBalance(
  accountId: string,
  amount: number,
  serviceType: string
): Promise<void> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      walletBalance: true,
      creditBalance: true,
      currency: true,
    },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  let walletDebit = 0;
  let creditDebit = 0;

  // Use credits first, then wallet balance
  if (account.creditBalance >= amount) {
    creditDebit = amount;
  } else {
    creditDebit = account.creditBalance;
    walletDebit = amount - creditDebit;
  }

  // Update account balance
  await prisma.account.update({
    where: { id: accountId },
    data: {
      walletBalance: { decrement: walletDebit },
      creditBalance: { decrement: creditDebit },
      lifetimeSpent: { increment: amount },
    },
  });

  // Create transaction record
  const transactionType = getTransactionType(serviceType);

  await prisma.transaction.create({
    data: {
      accountId,
      type: transactionType,
      amount: -amount,
      currency: account.currency,
      walletBefore: account.walletBalance,
      walletAfter: account.walletBalance - walletDebit,
      creditBefore: account.creditBalance,
      creditAfter: account.creditBalance - creditDebit,
      description: `${serviceType} service charge`,
      serviceType,
      status: 'completed',
    },
  });

  // Check and trigger low balance webhook if threshold reached
  const newBalance = (account.walletBalance - walletDebit) + (account.creditBalance - creditDebit);
  if (newBalance <= env.LOW_BALANCE_THRESHOLD) {
    triggerLowBalanceWebhook(accountId, newBalance).catch(err => 
      logger.error({ error: err, accountId }, 'Failed to trigger low balance webhook')
    );
  }

  // Check and trigger depleted balance webhook if balance is zero
  if (newBalance <= 0) {
    triggerDepletedBalanceWebhook(accountId).catch(err =>
      logger.error({ error: err, accountId }, 'Failed to trigger depleted balance webhook')
    );
  }
}

// Get transaction type based on service
function getTransactionType(serviceType: string): string {
  const typeMap: Record<string, string> = {
    sms: 'DEBIT',
    email: 'EMAIL_DEBIT',
    voice: 'VOICE_DEBIT',
    whatsapp: 'WHATSAPP_DEBIT',
    push: 'PUSH_DEBIT',
    lookup: 'LOOKUP_DEBIT',
    chat: 'CHAT_DEBIT',
  };

  return typeMap[serviceType.toLowerCase()] || 'DEBIT';
}

// Trigger low balance webhook
async function triggerLowBalanceWebhook(accountId: string, balance: number): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      accountId,
      isActive: true,
      events: { has: 'BALANCE_LOW' },
    },
  });

  for (const webhook of webhooks) {
    // Queue webhook delivery (implement queue system)
    logger.info({
      webhookId: webhook.id,
      accountId,
      balance,
    }, 'Triggering low balance webhook');
  }
}

// Trigger depleted balance webhook
async function triggerDepletedBalanceWebhook(accountId: string): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      accountId,
      isActive: true,
      events: { has: 'BALANCE_DEPLETED' },
    },
  });

  for (const webhook of webhooks) {
    logger.info({
      webhookId: webhook.id,
      accountId,
    }, 'Triggering depleted balance webhook');
  }
}

// Check daily/monthly limits for all service types
export const checkLimits = (serviceType: 'sms' | 'email' | 'voice' | 'whatsapp' | 'push' | 'lookup' | 'chat') => {
  return createMiddleware(async (c: Context, next: Next) => {
    const account = c.get('account');

    if (!account) {
      return ResponseBuilder.unauthorized(c, 'Authentication required');
    }

    try {
      const limits = await prisma.accountLimits.findUnique({
        where: { accountId: account.id },
      });

      if (!limits) {
        await next();
        return;
      }

      // Check daily limits for SMS
      if (serviceType === 'sms' && limits.dailySmsLimit) {
        if (limits.dailySmsSent >= limits.dailySmsLimit) {
          logger.warn({
            accountId: account.id,
            sent: limits.dailySmsSent,
            limit: limits.dailySmsLimit,
          }, 'Daily SMS limit exceeded');

          return ResponseBuilder.error(
            c,
            'DAILY_LIMIT_EXCEEDED',
            `Daily SMS limit of ${limits.dailySmsLimit} exceeded`,
            429
          );
        }
      }

      // Check monthly SMS limit
      if (serviceType === 'sms' && limits.monthlySmsLimit) {
        if (limits.monthlySmsSent >= limits.monthlySmsLimit) {
          logger.warn({
            accountId: account.id,
            sent: limits.monthlySmsSent,
            limit: limits.monthlySmsLimit,
          }, 'Monthly SMS limit exceeded');

          return ResponseBuilder.error(
            c,
            'MONTHLY_LIMIT_EXCEEDED',
            `Monthly SMS limit of ${limits.monthlySmsLimit} exceeded`,
            429
          );
        }
      }

      // Check daily spend limit (applies to all services)
      if (limits.dailySpendLimit && limits.dailySpent >= limits.dailySpendLimit) {
        return ResponseBuilder.error(
          c,
          'DAILY_SPEND_LIMIT_EXCEEDED',
          `Daily spend limit of ${limits.dailySpendLimit} exceeded`,
          429
        );
      }

      // Check monthly spend limit (applies to all services)
      if (limits.monthlySpendLimit && limits.monthlySpent >= limits.monthlySpendLimit) {
        return ResponseBuilder.error(
          c,
          'MONTHLY_SPEND_LIMIT_EXCEEDED',
          `Monthly spend limit of ${limits.monthlySpendLimit} exceeded`,
          429
        );
      }

      await next();
    } catch (error) {
      logger.error({ error, accountId: account.id }, 'Limit check error');
      return ResponseBuilder.serverError(c, 'Failed to check limits');
    }
  });
};