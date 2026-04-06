import type { Telegraf } from 'telegraf';
import { formatClientWebHandoff, formatJobDetail, formatWelcomeMessage } from '../../utils/formatters';
import { jobDetailKeyboard, mainMenuKeyboard } from '../../utils/keyboards';
import type { SerraleBotContext } from '../../types';
import { JobService } from '../../services/job.service';
import { UserService } from '../../services/user.service';
import { hasAdminAccess } from '../middleware/auth';
import { beginOnboarding } from '../scenes/onboarding';

export function registerStartCommand(bot: Telegraf<SerraleBotContext>) {
    bot.start(async (ctx) => {
        const rawText = ctx.message && 'text' in ctx.message ? ctx.message.text : '/start';
        const payload = rawText.split(' ').slice(1).join(' ').trim();
        const telegramUserId = String(ctx.from?.id || '');

        if (payload.startsWith('link_')) {
            try {
                const profile = await UserService.consumeLinkToken(payload.slice(5), telegramUserId);
                await ctx.reply(
                    `Telegram linked to Serrale profile ${profile?.serrale_id || profile?.full_name || profile?.name || profile?.id || ''}.`
                );
            } catch (error: any) {
                await ctx.reply(error?.message || 'Failed to link this Telegram account.');
            }
        }

        const status = await UserService.getLinkStatus(telegramUserId);
        const isAdmin = await hasAdminAccess(telegramUserId);

        if (payload.startsWith('apply_') || payload.startsWith('job_')) {
            const prefix = payload.startsWith('apply_') ? 'apply_' : 'job_';
            const jobId = payload.slice(prefix.length);

            if (!status.profile_id) {
                await beginOnboarding(ctx, { pendingJobId: jobId });
                return;
            }
            if (status.role === 'client') {
                await ctx.reply(
                    formatClientWebHandoff(),
                    mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role })
                );
                return;
            }

            const job = await JobService.getJobById(jobId, status.profile_id);
            if (job) {
                await ctx.reply(
                    formatJobDetail(job, {
                        linked: status.linked,
                        saved: Boolean(job.saved),
                    }),
                    jobDetailKeyboard({ jobId: job.id, page: 1, linked: status.linked, saved: Boolean(job.saved) })
                );
                return;
            }
        }

        await ctx.reply(
            formatWelcomeMessage(status),
            mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role })
        );
    });
}
