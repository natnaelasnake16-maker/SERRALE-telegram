import type { Telegraf } from 'telegraf';
import type { SerraleBotContext } from '../../types';
import { JobService } from '../../services/job.service';
import { UserService } from '../../services/user.service';
import { formatJobList, formatSavedJobsLocked } from '../../utils/formatters';
import { jobsListKeyboard, mainMenuKeyboard } from '../../utils/keyboards';
import { hasAdminAccess } from '../middleware/auth';

export function registerSavedCommand(bot: Telegraf<SerraleBotContext>) {
    bot.command('saved', async (ctx) => {
        const telegramUserId = String(ctx.from?.id || '');
        const status = await UserService.getLinkStatus(telegramUserId);
        const isAdmin = await hasAdminAccess(telegramUserId);

        if (!status.profile_id) {
            await ctx.reply(
                formatSavedJobsLocked(),
                mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role, state: status.state })
            );
            return;
        }

        const result = await JobService.listSavedJobs(status.profile_id, 1);
        await ctx.reply(
            formatJobList(result.jobs, 1, undefined, 'Saved'),
            jobsListKeyboard(result.jobs, 1, result.hasNextPage, { linked: true })
        );
    });
}
