import type { Telegram } from 'telegraf';
import { config } from '../config';
import { formatChannelCaption, formatChannelClosedCaption } from '../utils/formatters';
import { channelPostKeyboard } from '../utils/keyboards';
import { JobService } from './job.service';
import { supabase } from './supabase';

function nowIso() {
    return new Date().toISOString();
}

export class ChannelService {
    static async publishJob(telegram: Telegram, jobId: string, postedByProfileId: string | null) {
        const { data: existing, error: existingError } = await supabase
            .from('telegram_channel_posts')
            .select('*')
            .eq('job_id', jobId)
            .eq('status', 'posted')
            .maybeSingle();

        if (existingError) throw new Error(existingError.message);
        if (existing) {
            throw new Error('This job already has an active Telegram channel post');
        }

        const job = await JobService.getJobById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }

        const message = await telegram.sendMessage(
            config.telegramChannelUsername,
            formatChannelCaption(job),
            channelPostKeyboard(jobId)
        );

        const { error } = await supabase.from('telegram_channel_posts').insert({
            job_id: jobId,
            channel_chat_id: String(message.chat.id),
            channel_message_id: String(message.message_id),
            channel_username: config.telegramChannelUsername,
            status: 'posted',
            posted_by_profile_id: postedByProfileId,
            posted_at: nowIso(),
            updated_at: nowIso(),
        });

        if (error) throw new Error(error.message);
        return message;
    }

    static async closeJobPost(telegram: Telegram, jobId: string, closedByProfileId: string | null) {
        const { data: existing, error: existingError } = await supabase
            .from('telegram_channel_posts')
            .select('*')
            .eq('job_id', jobId)
            .eq('status', 'posted')
            .maybeSingle();

        if (existingError) throw new Error(existingError.message);
        if (!existing) {
            throw new Error('No active Telegram channel post found for this job');
        }

        const closedJob = await JobService.closeJob(jobId);
        await telegram.editMessageText(
            String(existing.channel_chat_id),
            Number(existing.channel_message_id),
            undefined,
            formatChannelClosedCaption(closedJob),
            channelPostKeyboard(jobId, { closed: true })
        );

        const { error } = await supabase
            .from('telegram_channel_posts')
            .update({
                status: 'closed',
                closed_by_profile_id: closedByProfileId,
                closed_at: nowIso(),
                updated_at: nowIso(),
            })
            .eq('id', existing.id);

        if (error) throw new Error(error.message);
        return closedJob;
    }
}
