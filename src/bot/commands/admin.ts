import type { Telegraf } from 'telegraf';
import type { SerraleBotContext } from '../../types';
import { ApplicationService } from '../../services/application.service';
import { ChannelService } from '../../services/channel.service';
import { JobService } from '../../services/job.service';
import { UserService } from '../../services/user.service';
import { adminJobsKeyboard } from '../../utils/keyboards';
import { formatJobList } from '../../utils/formatters';
import { requireAdmin } from '../middleware/auth';

function extractArg(text: string) {
    return text.split(' ').slice(1).join(' ').trim();
}

export function registerAdminCommands(bot: Telegraf<SerraleBotContext>) {
    bot.command('listjobs', async (ctx) => {
        await requireAdmin(ctx, async () => {
            const queue = await JobService.listPublishableJobs(1);
            await ctx.reply(
                formatJobList(queue.jobs, 1),
                adminJobsKeyboard(queue.jobs, 1, queue.hasNextPage)
            );
        });
    });

    bot.command('postjob', async (ctx) => {
        await requireAdmin(ctx, async () => {
            const jobId = extractArg(ctx.message.text);
            if (!jobId) {
                await ctx.reply('Usage: /postjob <jobId>');
                return;
            }

            const status = await UserService.getLinkStatus(String(ctx.from?.id || ''));
            await ChannelService.publishJob(bot.telegram, jobId, status.profile_id);
            await ctx.reply(`Job ${jobId} published to ${process.env.TELEGRAM_CHANNEL_USERNAME || '@SerraleJobs'}.`);
        });
    });

    bot.command('closejob', async (ctx) => {
        await requireAdmin(ctx, async () => {
            const jobId = extractArg(ctx.message.text);
            if (!jobId) {
                await ctx.reply('Usage: /closejob <jobId>');
                return;
            }

            const status = await UserService.getLinkStatus(String(ctx.from?.id || ''));
            const closedJob = await ChannelService.closeJobPost(bot.telegram, jobId, status.profile_id);
            await ctx.reply(`Closed ${closedJob.title} on Serrale and updated the Telegram channel post.`);
        });
    });

    bot.command('applications', async (ctx) => {
        await requireAdmin(ctx, async () => {
            const jobId = extractArg(ctx.message.text);
            if (!jobId) {
                await ctx.reply('Usage: /applications <jobId>');
                return;
            }

            const applications = await ApplicationService.listForJob(jobId);
            if (applications.length === 0) {
                await ctx.reply('No Telegram applications found for this job.');
                return;
            }

            await ctx.reply(
                applications
                    .map((application, index) =>
                        `${index + 1}. ${application.full_name}\n   ${application.phone} · ${application.profile_id ? 'Linked' : 'Unlinked'} · ${application.cv_file_url ? 'CV uploaded' : 'No CV'} · ${application.submitted_at.slice(0, 10)}`
                    )
                    .join('\n\n')
            );
        });
    });

    bot.command('applicant', async (ctx) => {
        await requireAdmin(ctx, async () => {
            const applicationId = extractArg(ctx.message.text);
            if (!applicationId) {
                await ctx.reply('Usage: /applicant <applicationId>');
                return;
            }

            const application = await ApplicationService.getById(applicationId);
            if (!application) {
                await ctx.reply('Telegram application not found.');
                return;
            }

            await ctx.reply(
                [
                    `${application.full_name}`,
                    `Phone: ${application.phone}`,
                    `Email: ${application.email || 'Not provided'}`,
                    `Linked profile: ${application.profile_id || 'No'}`,
                    `Status: ${application.status}`,
                    `CV: ${application.cv_file_url || 'Not uploaded'}`,
                    `Submitted: ${application.submitted_at}`,
                    '',
                    application.note || 'No note provided.',
                ].join('\n')
            );
        });
    });

    bot.command('markreviewed', async (ctx) => {
        await requireAdmin(ctx, async () => {
            const applicationId = extractArg(ctx.message.text);
            if (!applicationId) {
                await ctx.reply('Usage: /markreviewed <applicationId>');
                return;
            }

            const reviewed = await ApplicationService.markReviewed(applicationId);
            await ctx.reply(`Marked ${reviewed.full_name}'s Telegram application as reviewed.`);
        });
    });
}
