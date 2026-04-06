import type { MiddlewareFn } from 'telegraf';
import { config } from '../../config';
import type { SerraleBotContext } from '../../types';
import { logger } from '../../utils/logger';
import { UserService } from '../../services/user.service';

export const trackUser: MiddlewareFn<SerraleBotContext> = async (ctx, next) => {
    try {
        await UserService.attachContextUser(ctx);
    } catch (error) {
        logger.error('Failed to track Telegram user', { error });
    }

    return next();
};

export async function hasAdminAccess(telegramUserId: string) {
    if (config.telegramAdminIds.includes(telegramUserId)) {
        return true;
    }

    return UserService.isAdmin(telegramUserId);
}

export async function requireAdmin(ctx: SerraleBotContext, next: () => Promise<unknown>) {
    const telegramUserId = String(ctx.from?.id || '');
    if (!telegramUserId || !(await hasAdminAccess(telegramUserId))) {
        await ctx.reply('Admin access is required for that action.');
        return;
    }

    await next();
}

export async function errorHandler(error: unknown, ctx: SerraleBotContext) {
    logger.error('Unhandled Telegram bot error', {
        error,
        telegramUserId: ctx.from?.id ? String(ctx.from.id) : null,
        updateType: ctx.updateType,
    });

    await ctx.reply('Something went wrong while handling that Telegram request.');
}
