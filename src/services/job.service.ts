import type { JobSummary, PublishableJob } from '../types';
import { supabase } from './supabase';

const PAGE_SIZE = 5;

function asJobSummary(row: Record<string, any>, saved = false): JobSummary {
    return {
        id: String(row.id),
        title: String(row.title || 'Untitled job'),
        category: row.category ? String(row.category) : null,
        city: row.city ? String(row.city) : null,
        budget: typeof row.budget === 'number' ? row.budget : null,
        budget_min: typeof row.budget_min === 'number' ? row.budget_min : null,
        budget_max: typeof row.budget_max === 'number' ? row.budget_max : null,
        job_type: row.job_type ? String(row.job_type) : null,
        duration: row.duration ? String(row.duration) : null,
        location_type: row.location_type ? String(row.location_type) : null,
        status: row.status ? String(row.status) : null,
        description: row.description ? String(row.description) : null,
        experience_level: row.experience_level ? String(row.experience_level) : null,
        saved,
        created_at: row.created_at ? String(row.created_at) : undefined,
    };
}

export class JobService {
    static async listOpenJobs(options: { page?: number; pageSize?: number; query?: string; profileId?: string | null }) {
        const page = Math.max(1, options.page || 1);
        const pageSize = Math.max(1, options.pageSize || PAGE_SIZE);
        const from = (page - 1) * pageSize;
        const to = from + pageSize;

        let queryBuilder = supabase
            .from('jobs')
            .select('id, title, category, city, budget, budget_min, budget_max, job_type, duration, location_type, status, description, experience_level, created_at')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .range(from, to);

        if (options.query) {
            const term = options.query.trim();
            if (term) {
                queryBuilder = queryBuilder.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
            }
        }

        const { data, error } = await queryBuilder;
        if (error) throw new Error(error.message);

        const rows = (data || []) as Array<Record<string, any>>;
        const pageRows = rows.slice(0, pageSize);
        const savedIds = new Set<string>();

        if (options.profileId && pageRows.length > 0) {
            const { data: savedRows, error: savedError } = await supabase
                .from('saved_jobs')
                .select('job_id')
                .eq('profile_id', options.profileId)
                .in('job_id', pageRows.map((row) => row.id));

            if (savedError) throw new Error(savedError.message);
            (savedRows || []).forEach((row) => savedIds.add(String(row.job_id)));
        }

        return {
            jobs: pageRows.map((row) => asJobSummary(row, savedIds.has(String(row.id)))),
            page,
            hasNextPage: rows.length === pageSize + 1,
        };
    }

    static async getJobById(jobId: string, profileId?: string | null) {
        const { data, error } = await supabase
            .from('jobs')
            .select('id, title, category, city, budget, budget_min, budget_max, job_type, duration, location_type, status, description, experience_level, created_at')
            .eq('id', jobId)
            .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) return null;

        let saved = false;
        if (profileId) {
            const { data: savedRow, error: savedError } = await supabase
                .from('saved_jobs')
                .select('job_id')
                .eq('profile_id', profileId)
                .eq('job_id', jobId)
                .maybeSingle();

            if (savedError) throw new Error(savedError.message);
            saved = Boolean(savedRow);
        }

        return asJobSummary(data as Record<string, any>, saved);
    }

    static async toggleSavedJob(profileId: string, jobId: string, save: boolean) {
        if (save) {
            const { error } = await supabase
                .from('saved_jobs')
                .upsert({ profile_id: profileId, job_id: jobId }, { onConflict: 'profile_id,job_id' });

            if (error) throw new Error(error.message);
        } else {
            const { error } = await supabase
                .from('saved_jobs')
                .delete()
                .eq('profile_id', profileId)
                .eq('job_id', jobId);

            if (error) throw new Error(error.message);
        }
    }

    static async listPublishableJobs(page = 1, pageSize = PAGE_SIZE) {
        const currentPage = Math.max(1, page);
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize;

        const { data, error } = await supabase
            .from('telegram_publishable_jobs_v1')
            .select('*')
            .range(from, to)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        const rows = (data || []) as Array<Record<string, any>>;
        const pageRows = rows.slice(0, pageSize);
        return {
            jobs: pageRows.map((row) => ({
                ...asJobSummary(row),
                client_name: row.client_name ? String(row.client_name) : null,
                active_post_count: Number(row.active_post_count || 0),
            })) as PublishableJob[],
            page: currentPage,
            hasNextPage: rows.length === pageSize + 1,
        };
    }

    static async closeJob(jobId: string) {
        const { data, error } = await supabase
            .from('jobs')
            .update({
                status: 'closed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', jobId)
            .select('id, title, category, city, budget, budget_min, budget_max, job_type, duration, location_type, status, description, experience_level, created_at')
            .single();

        if (error) throw new Error(error.message);
        return asJobSummary(data as Record<string, any>);
    }
}
