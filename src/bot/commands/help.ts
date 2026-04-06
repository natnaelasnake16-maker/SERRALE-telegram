import type { Telegraf } from 'telegraf';
import { formatHelpMessage } from '../../utils/formatters';
import { mainMenuKeyboard } from '../../utils/keyboards';
import type { SerraleBotContext } from '../../types';
import { UserService } from '../../services/user.service';
import { hasAdminAccess } from '../middleware/auth';

export function registerHelpCommand(bot: Telegraf<SerraleBotContext>) {
    bot.command('help', async (ctx) => {
        const telegramUserId = String(ctx.from?.id || '');
        const status = await UserService.getLinkStatus(telegramUserId);
        const isAdmin = await hasAdminAccess(telegramUserId);
        await ctx.reply(formatHelpMessage(), mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role }));
    });
}
