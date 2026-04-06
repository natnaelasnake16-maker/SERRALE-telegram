import { Telegraf } from 'telegraf';
import { config } from '../config';
import type { SerraleBotContext } from '../types';
import { JobService } from '../services/job.service';
import { UserService } from '../services/user.service';
import { formatClientWebHandoff, formatHelpMessage, formatJobList } from '../utils/formatters';
import { jobsListKeyboard, mainMenuKeyboard } from '../utils/keyboards';
import { logger } from '../utils/logger';
import { registerAdminCommands } from './commands/admin';
import { registerHelpCommand } from './commands/help';
import { registerStartCommand } from './commands/start';
import { registerStatusCommand } from './commands/status';
import { errorHandler, hasAdminAccess, trackUser } from './middleware/auth';
import { registerCallbackHandler } from './handlers/callback';
import { beginOnboarding, handleOnboardingText } from './scenes/onboarding';

export function createBot() {
    const bot = new Telegraf<SerraleBotContext>(config.telegramBotToken);

    bot.use(trackUser);
    bot.catch(errorHandler);

    registerStartCommand(bot);
    registerStatusCommand(bot);
    registerHelpCommand(bot);
    registerAdminCommands(bot);
    registerCallbackHandler(bot);

    bot.hears(/^search\s+(.+)/i, async (ctx) => {
        const query = ctx.match[1]?.trim() || '';
        const status = await UserService.getLinkStatus(String(ctx.from?.id || ''));
        if (!status.profile_id) {
            await beginOnboarding(ctx);
            return;
        }
        if (status.role === 'client') {
            const isAdmin = await hasAdminAccess(String(ctx.from?.id || ''));
            await ctx.reply(formatClientWebHandoff(), mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role }));
            return;
        }
        const result = await JobService.listOpenJobs({ page: 1, query, profileId: status.profile_id });
        await ctx.reply(formatJobList(result.jobs, 1, query), jobsListKeyboard(result.jobs, 1, result.hasNextPage));
    });

    bot.on('text', async (ctx) => {
        if (await handleOnboardingText(ctx)) {
            return;
        }

        const message = ctx.message.text.trim();
        if (message.startsWith('/')) {
            return;
        }

        const telegramUserId = String(ctx.from?.id || '');
        const status = await UserService.getLinkStatus(telegramUserId);
        const isAdmin = await hasAdminAccess(telegramUserId);
        if (!status.profile_id) {
            await beginOnboarding(ctx);
            return;
        }
        await ctx.reply(
            `${formatHelpMessage()}\n\nUse the menu if you want the guided flow instead of free text.`,
            mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role })
        );
    });

    logger.info('Telegram bot assembled', {
        webhookMode: config.isWebhookMode,
        botUsername: config.telegramBotUsername,
    });

    return bot;
}
