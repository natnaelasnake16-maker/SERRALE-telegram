import type { Telegraf } from 'telegraf';
import {
    beginOnboarding,
    handleCategorySelection,
    handleCitySelection,
    handleRoleSelection,
} from '../scenes/onboarding';
import type { SerraleBotContext } from '../../types';
import { JobService } from '../../services/job.service';
import { UserService } from '../../services/user.service';
import { ChannelService } from '../../services/channel.service';
import {
    adminJobsKeyboard,
    jobDetailKeyboard,
    jobsListKeyboard,
    mainMenuKeyboard,
} from '../../utils/keyboards';
import {
    formatClientWebHandoff,
    formatHelpMessage,
    formatJobDetail,
    formatJobList,
    formatStatusMessage,
    formatWelcomeMessage,
} from '../../utils/formatters';
import { hasAdminAccess } from '../middleware/auth';

async function respond(ctx: SerraleBotContext, text: string, extra?: any) {
    try {
        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, extra);
            return;
        }
    } catch {
        // Fall back to reply when the callback message can no longer be edited.
    }

    await ctx.reply(text, extra);
}

export function registerCallbackHandler(bot: Telegraf<SerraleBotContext>) {
    bot.on('callback_query', async (ctx) => {
        const data = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data || '') : '';
        const telegramUserId = String(ctx.from?.id || '');
        const status = await UserService.getLinkStatus(telegramUserId);
        const isAdmin = await hasAdminAccess(telegramUserId);

        await ctx.answerCbQuery();

        if (data === 'menu:home') {
            await respond(ctx, formatWelcomeMessage(status), mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role }));
            return;
        }

        if (data === 'menu:status') {
            await respond(ctx, formatStatusMessage(status), mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role }));
            return;
        }

        if (data === 'menu:help') {
            await respond(ctx, formatHelpMessage(), mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role }));
            return;
        }

        if (data === 'menu:onboard') {
            await beginOnboarding(ctx);
            return;
        }

        if (data === 'menu:jobs') {
            if (!status.profile_id) {
                await beginOnboarding(ctx);
                return;
            }
            if (status.role === 'client') {
                await respond(ctx, formatClientWebHandoff(), mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role }));
                return;
            }

            const result = await JobService.listOpenJobs({ page: 1, profileId: status.profile_id });
            await respond(ctx, formatJobList(result.jobs, 1), jobsListKeyboard(result.jobs, 1, result.hasNextPage));
            return;
        }

        if (data.startsWith('jobs:page:')) {
            if (!status.profile_id) {
                await beginOnboarding(ctx);
                return;
            }
            if (status.role === 'client') {
                await respond(ctx, formatClientWebHandoff(), mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role }));
                return;
            }

            const page = Number(data.split(':')[2] || '1');
            const result = await JobService.listOpenJobs({ page, profileId: status.profile_id });
            await respond(ctx, formatJobList(result.jobs, page), jobsListKeyboard(result.jobs, page, result.hasNextPage));
            return;
        }

        if (data.startsWith('job:view:')) {
            const [, , jobId, pageText] = data.split(':');
            const page = Number(pageText || '1');

            if (!status.profile_id) {
                await beginOnboarding(ctx, { pendingJobId: jobId });
                return;
            }

            const job = await JobService.getJobById(jobId, status.profile_id);
            if (!job) {
                await respond(ctx, 'That Serrale job could not be found.');
                return;
            }

            await respond(
                ctx,
                formatJobDetail(job, { linked: status.linked, saved: Boolean(job.saved) }),
                jobDetailKeyboard({ jobId, page, linked: status.linked, saved: Boolean(job.saved) })
            );
            return;
        }

        if (data.startsWith('job:save:') || data.startsWith('job:unsave:')) {
            if (!status.profile_id) {
                await beginOnboarding(ctx);
                return;
            }

            const [, action, jobId, pageText] = data.split(':');
            const page = Number(pageText || '1');
            await JobService.toggleSavedJob(status.profile_id, jobId, action === 'save');
            const job = await JobService.getJobById(jobId, status.profile_id);
            if (!job) {
                await respond(ctx, 'That Serrale job could not be found.');
                return;
            }

            await respond(
                ctx,
                formatJobDetail(job, { linked: true, saved: Boolean(job.saved) }),
                jobDetailKeyboard({ jobId, page, linked: true, saved: Boolean(job.saved) })
            );
            return;
        }

        if (data.startsWith('onboard:city:')) {
            await handleCitySelection(ctx, data.slice('onboard:city:'.length));
            return;
        }

        if (data.startsWith('onboard:role:')) {
            const role = data.slice('onboard:role:'.length) as 'service_provider' | 'client';
            await handleRoleSelection(ctx, role);
            return;
        }

        if (data.startsWith('onboard:category:')) {
            await handleCategorySelection(ctx, data.slice('onboard:category:'.length));
            return;
        }

        if (data.startsWith('admin:jobs:')) {
            if (!isAdmin) {
                await respond(ctx, 'Admin access is required for that action.');
                return;
            }

            const page = Number(data.split(':')[2] || '1');
            const queue = await JobService.listPublishableJobs(page);
            await respond(ctx, formatJobList(queue.jobs, page), adminJobsKeyboard(queue.jobs, page, queue.hasNextPage));
            return;
        }

        if (data.startsWith('admin:publish:')) {
            if (!isAdmin) {
                await respond(ctx, 'Admin access is required for that action.');
                return;
            }

            const jobId = data.split(':')[2] || '';
            await ChannelService.publishJob(bot.telegram, jobId, status.profile_id);
            await respond(ctx, `Published ${jobId} to the Serrale Telegram channel.`, mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role }));
            return;
        }

        if (data.startsWith('admin:close:')) {
            if (!isAdmin) {
                await respond(ctx, 'Admin access is required for that action.');
                return;
            }

            const jobId = data.split(':')[2] || '';
            const job = await ChannelService.closeJobPost(bot.telegram, jobId, status.profile_id);
            await respond(ctx, `Closed ${job.title} and updated the Telegram channel post.`, mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role }));
        }
    });
}
