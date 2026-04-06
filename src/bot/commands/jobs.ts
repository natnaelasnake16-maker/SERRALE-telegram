import type { Telegraf } from 'telegraf';
import type { SerraleBotContext } from '../../types';
import { JobService } from '../../services/job.service';
import { UserService } from '../../services/user.service';
import { formatJobList, formatWelcomeMessage } from '../../utils/formatters';
import { jobsListKeyboard, mainMenuKeyboard } from '../../utils/keyboards';
import { hasAdminAccess } from '../middleware/auth';

export function registerJobsCommand(bot: Telegraf<SerraleBotContext>) {
    bot.command('jobs', async (ctx) => {
        const telegramUserId = String(ctx.from?.id || '');
        const status = await UserService.getLinkStatus(telegramUserId);
        const isAdmin = await hasAdminAccess(telegramUserId);
        const result = await JobService.listOpenJobs({
            page: 1,
            profileId: status.profile_id,
            status,
            filter: 'all',
        });

        if (result.jobs.length === 0) {
            await ctx.reply(
                `${formatWelcomeMessage(status)}\n\nNo open jobs are available right now.`,
                mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role, state: status.state })
            );
            return;
        }

        await ctx.reply(
            formatJobList(result.jobs, 1, undefined, 'All'),
            jobsListKeyboard(result.jobs, 1, result.hasNextPage, { linked: status.linked, filter: 'all' })
        );
    });
}
