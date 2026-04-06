import type {
    TelegramApplicationCreateInput,
    TelegramApplicationStats,
    TelegramJobApplicationRecord,
} from '../types';
import { JobService } from './job.service';
import { UserService } from './user.service';
import { supabase } from './supabase';

type LooseRecord = Record<string, any>;

function nowIso() {
    return new Date().toISOString();
}

function asNullableString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asApplication(row: LooseRecord): TelegramJobApplicationRecord {
    return {
        id: String(row.id),
        job_id: String(row.job_id),
        telegram_user_id: String(row.telegram_user_id),
        profile_id: asNullableString(row.profile_id),
        full_name: String(row.full_name || ''),
        phone: String(row.phone || ''),
        email: asNullableString(row.email),
        cv_file_url: asNullableString(row.cv_file_url),
        cv_file_name: asNullableString(row.cv_file_name),
        note: asNullableString(row.note),
        status: (row.status || 'submitted') as TelegramJobApplicationRecord['status'],
        source: 'telegram_bot',
        submitted_at: String(row.submitted_at || row.created_at || nowIso()),
        promoted_to_proposal_id: asNullableString(row.promoted_to_proposal_id),
        raw_payload: (row.raw_payload as Record<string, unknown> | null) || null,
    };
}

export class ApplicationService {
    static async getStatsForTelegramUser(telegramUserId: string): Promise<TelegramApplicationStats> {
        const { data, error } = await supabase
            .from('telegram_job_applications')
            .select('submitted_at')
            .eq('telegram_user_id', telegramUserId)
            .order('submitted_at', { ascending: false });

        if (error) throw new Error(error.message);

        return {
            count: (data || []).length,
            last_submitted_at: data?.[0]?.submitted_at || null,
        };
    }

    static async listForTelegramUser(telegramUserId: string) {
        const { data, error } = await supabase
            .from('telegram_job_applications')
            .select('*')
            .eq('telegram_user_id', telegramUserId)
            .order('submitted_at', { ascending: false });

        if (error) throw new Error(error.message);
        return (data || []).map((row) => asApplication(row as LooseRecord));
    }

    static async listForJob(jobId: string) {
        const { data, error } = await supabase
            .from('telegram_job_applications')
            .select('*')
            .eq('job_id', jobId)
            .order('submitted_at', { ascending: false });

        if (error) throw new Error(error.message);
        return (data || []).map((row) => asApplication(row as LooseRecord));
    }

    static async getById(applicationId: string) {
        const { data, error } = await supabase
            .from('telegram_job_applications')
            .select('*')
            .eq('id', applicationId)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data ? asApplication(data as LooseRecord) : null;
    }

    static async create(jobId: string, telegramUserId: string, input: TelegramApplicationCreateInput) {
        const telegramUser = await UserService.getTelegramUser(telegramUserId);
        if (!telegramUser) {
            throw new Error('Telegram user not found');
        }

        const job = await JobService.getJobById(jobId, telegramUser.profile_id);
        if (!job) {
            throw new Error('Job not found');
        }

        if (job.status && job.status !== 'open') {
            throw new Error('This job is no longer accepting applications');
        }

        if (await this.hasAppliedToJob(jobId, telegramUserId)) {
            throw new Error('You already submitted a Telegram application for this job');
        }

        const payload = {
            job_id: jobId,
            telegram_user_id: telegramUserId,
            profile_id: telegramUser.profile_id,
            full_name: input.full_name.trim(),
            phone: input.phone.trim(),
            email: asNullableString(input.email),
            cv_file_url: asNullableString(input.cv_file_url),
            cv_file_name: asNullableString(input.cv_file_name),
            note: asNullableString(input.note),
            status: 'submitted',
            source: 'telegram_bot',
            submitted_at: nowIso(),
            raw_payload: {
                ...input,
                linked_profile_id: telegramUser.profile_id,
            },
            created_at: nowIso(),
            updated_at: nowIso(),
        };

        const { data, error } = await supabase
            .from('telegram_job_applications')
            .insert(payload)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        return asApplication(data as LooseRecord);
    }

    static async hasAppliedToJob(jobId: string, telegramUserId: string) {
        const { data, error } = await supabase
            .from('telegram_job_applications')
            .select('id')
            .eq('job_id', jobId)
            .eq('telegram_user_id', telegramUserId)
            .limit(1);

        if (error) throw new Error(error.message);
        return (data || []).length > 0;
    }

    static async markReviewed(applicationId: string) {
        const { data, error } = await supabase
            .from('telegram_job_applications')
            .update({
                status: 'reviewed',
                updated_at: nowIso(),
            })
            .eq('id', applicationId)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        return asApplication(data as LooseRecord);
    }
}
