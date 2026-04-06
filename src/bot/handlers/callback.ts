import type { Telegraf } from 'telegraf';
import {
    beginOnboarding,
    handleCategorySelection,
    handleCitySelection,
    handleRoleSelection,
} from '../scenes/onboarding';
import type { JobFilterKey, SerraleBotContext } from '../../types';
import { ApplicationService } from '../../services/application.service';
import { ChannelService } from '../../services/channel.service';
import { JobService } from '../../services/job.service';
import { RecommendationService } from '../../services/recommendation.service';
import { UserService } from '../../services/user.service';
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
    formatLinkPrompt,
    formatSavedJobsLocked,
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

async function menuKeyboardFor(ctx: SerraleBotContext, telegramUserId: string) {
    const status = await UserService.getLinkStatus(telegramUserId);
    const isAdmin = await hasAdminAccess(telegramUserId);
    return {
        status,
        isAdmin,
        keyboard: mainMenuKeyboard({
            linked: status.linked,
            isAdmin,
            role: status.role,
            state: status.state,
        }),
    };
}

async function renderJobs(
    ctx: SerraleBotContext,
    status: Awaited<ReturnType<typeof UserService.getLinkStatus>>,
    filter: JobFilterKey,
    page = 1
) {
    const result = await JobService.listOpenJobs({
        page,
        profileId: status.profile_id,
        filter,
        status,
    });

    await respond(
        ctx,
        formatJobList(result.jobs, page, undefined, filter.replace(/_/g, ' ')),
        jobsListKeyboard(result.jobs, page, result.hasNextPage, { linked: status.linked, filter })
    );
}

export function registerCallbackHandler(bot: Telegraf<SerraleBotContext>) {
    bot.on('callback_query', async (ctx) => {
        const data = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data || '') : '';
        const telegramUserId = String(ctx.from?.id || '');
        const { status, isAdmin, keyboard } = await menuKeyboardFor(ctx, telegramUserId);

        await ctx.answerCbQuery();

        if (data === 'menu:home') {
            await respond(ctx, formatWelcomeMessage(status), keyboard);
            return;
        }

        if (data === 'menu:status') {
            await respond(ctx, formatStatusMessage(status), keyboard);
            return;
        }

        if (data === 'menu:help') {
            await respond(ctx, formatHelpMessage(), keyboard);
            return;
        }

        if (data === 'menu:onboard' || data === 'intake:start' || data === 'intake:continue') {
            await beginOnboarding(ctx);
            return;
        }

        if (data === 'link:start') {
            await respond(ctx, formatLinkPrompt(), keyboard);
            return;
        }

        if (data === 'menu:jobs') {
            await renderJobs(ctx, status, 'all', 1);
            return;
        }

        if (data === 'menu:saved') {
            if (!status.profile_id) {
                await respond(ctx, formatSavedJobsLocked(), keyboard);
                return;
            }

            const result = await JobService.listSavedJobs(status.profile_id, 1);
            await respond(
                ctx,
                formatJobList(result.jobs, 1, undefined, 'saved'),
                jobsListKeyboard(result.jobs, 1, result.hasNextPage, { linked: true, filter: 'saved' })
            );
            return;
        }

        if (data === 'menu:recommended') {
            if (!status.profile_id || status.role === 'client') {
                await respond(ctx, formatClientWebHandoff(), keyboard);
                return;
            }

            const jobs = await RecommendationService.listRecommendedJobs(status);
            await respond(
                ctx,
                formatJobList(jobs, 1, undefined, 'recommended'),
                jobsListKeyboard(jobs, 1, false, { linked: true, filter: 'my_category' })
            );
            return;
        }

        if (data.startsWith('jobs:filter:')) {
            const filter = data.split(':')[2] as JobFilterKey;
            await renderJobs(ctx, status, filter, 1);
            return;
        }

        if (data.startsWith('jobs:page:')) {
            const page = Number(data.split(':')[2] || '1');
            await renderJobs(ctx, status, 'all', page);
            return;
        }

        if (data.startsWith('job:view:') || data.startsWith('job:apply:')) {
            const jobId = data.split(':')[2] || '';
            const job = await JobService.getJobById(jobId, status.profile_id);
            if (!job) {
                await respond(ctx, 'That Serrale job could not be found.');
                return;
            }

            await respond(
                ctx,
                formatJobDetail(job, { linked: status.linked, saved: Boolean(job.saved) }),
                jobDetailKeyboard({ jobId, page: 1, linked: status.linked, saved: Boolean(job.saved) })
            );
            return;
        }

        if (data.startsWith('job:share:')) {
            const jobId = data.split(':')[2] || '';
            await respond(ctx, `Share this job:\nhttps://t.me/${bot.botInfo?.username || ''}?start=job_${jobId}`, keyboard);
            return;
        }

        if (data.startsWith('job:save:') || data.startsWith('job:unsave:')) {
            if (!status.profile_id) {
                await respond(ctx, formatSavedJobsLocked(), keyboard);
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

        if (data === 'admin:listjobs' || data.startsWith('admin:jobs:')) {
            if (!isAdmin) {
                await respond(ctx, 'Admin access is required for that action.');
                return;
            }

            const page = data === 'admin:listjobs' ? 1 : Number(data.split(':')[2] || '1');
            const queue = await JobService.listPublishableJobs(page);
            await respond(ctx, formatJobList(queue.jobs, page, undefined, 'publish queue'), adminJobsKeyboard(queue.jobs, page, queue.hasNextPage));
            return;
        }

        if (data.startsWith('admin:publish:')) {
            if (!isAdmin) {
                await respond(ctx, 'Admin access is required for that action.');
                return;
            }

            const jobId = data.split(':')[2] || '';
            await ChannelService.publishJob(bot.telegram, jobId, status.profile_id);
            const applications = await ApplicationService.listForJob(jobId).catch(() => []);
            await respond(
                ctx,
                `Published ${jobId} to the Serrale Telegram channel.\nTelegram applications currently on file: ${applications.length}.`,
                keyboard
            );
            return;
        }

        if (data.startsWith('admin:close:')) {
            if (!isAdmin) {
                await respond(ctx, 'Admin access is required for that action.');
                return;
            }

            const jobId = data.split(':')[2] || '';
            const job = await ChannelService.closeJobPost(bot.telegram, jobId, status.profile_id);
            await respond(ctx, `Closed ${job.title} and updated the Telegram channel post.`, keyboard);
        }
    });
}
