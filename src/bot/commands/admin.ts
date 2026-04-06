import type { Telegraf } from 'telegraf';
import type { SerraleBotContext } from '../../types';
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
}
