import type { JobFilterKey, JobSummary, PublishableJob, TelegramLinkStatus } from '../types';
import { supabase } from './supabase';

const PAGE_SIZE = 5;

function asStringList(value: unknown) {
    if (Array.isArray(value)) {
        return value
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean);
    }

    return [];
}

function asJobSummary(row: Record<string, any>, saved = false): JobSummary {
    const relatedSkills = Array.isArray(row.job_skills)
        ? row.job_skills
              .map((item: any) => {
                  if (typeof item?.skills?.name === 'string') return item.skills.name.trim();
                  if (typeof item?.name === 'string') return item.name.trim();
                  return '';
              })
              .filter(Boolean)
        : [];

    const inlineSkills = asStringList(row.skills);

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
        deadline: row.deadline ? String(row.deadline) : null,
        gender: row.gender ? String(row.gender) : null,
        education_level: row.education_level ? String(row.education_level) : null,
        client_name: row.client?.full_name ? String(row.client.full_name) : null,
        client_verified: Boolean(row.client?.verified_identity),
        skills: Array.from(new Set([...relatedSkills, ...inlineSkills])).slice(0, 12),
        sub_category: row.sub_category ? String(row.sub_category) : null,
    };
}

export class JobService {
    static async listOpenJobs(options: {
        page?: number;
        pageSize?: number;
        query?: string;
        profileId?: string | null;
        filter?: JobFilterKey;
        status?: Pick<TelegramLinkStatus, 'city' | 'main_skill_category'> | null;
    }) {
        const page = Math.max(1, options.page || 1);
        const pageSize = Math.max(1, options.pageSize || PAGE_SIZE);
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        const filter = options.filter || 'all';

        let savedIdsForFilter: string[] | null = null;
        if (filter === 'saved') {
            if (!options.profileId) {
                return {
                    jobs: [],
                    page,
                    hasNextPage: false,
                };
            }

            const { data: savedRows, error: savedRowsError } = await supabase
                .from('saved_jobs')
                .select('job_id')
                .eq('profile_id', options.profileId);

            if (savedRowsError) throw new Error(savedRowsError.message);

            savedIdsForFilter = (savedRows || []).map((row) => String(row.job_id));
            if (savedIdsForFilter.length === 0) {
                return {
                    jobs: [],
                    page,
                    hasNextPage: false,
                };
            }
        }

        let queryBuilder = supabase
            .from('jobs')
            .select(
                'id, title, category, sub_category, city, budget, budget_min, budget_max, job_type, duration, location_type, status, description, experience_level, created_at, deadline, gender, education_level, skills, client:profiles!client_id(full_name, verified_identity), job_skills(skills(name))'
            )
            .eq('status', 'open');

        if (filter === 'remote') {
            queryBuilder = queryBuilder.eq('location_type', 'remote');
        }

        if (filter === 'nearby' && options.status?.city) {
            queryBuilder = queryBuilder.eq('city', options.status.city);
        }

        if (filter === 'my_category' && options.status?.main_skill_category) {
            const category = options.status.main_skill_category.replace(/,/g, '');
            queryBuilder = queryBuilder.or(`category.eq.${category},sub_category.eq.${category}`);
        }

        if (savedIdsForFilter) {
            queryBuilder = queryBuilder.in('id', savedIdsForFilter);
        }

        if (options.query) {
            const term = options.query.trim();
            if (term) {
                queryBuilder = queryBuilder.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
            }
        }

        queryBuilder = queryBuilder.order('created_at', { ascending: false }).range(from, to);

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

    static async listSavedJobs(profileId: string, page = 1, pageSize = PAGE_SIZE) {
        return this.listOpenJobs({
            page,
            pageSize,
            profileId,
            filter: 'saved',
        });
    }

    static async getJobById(jobId: string, profileId?: string | null) {
        const { data, error } = await supabase
            .from('jobs')
            .select(
                'id, title, category, sub_category, city, budget, budget_min, budget_max, job_type, duration, location_type, status, description, experience_level, created_at, deadline, gender, education_level, skills, client:profiles!client_id(full_name, verified_identity), job_skills(skills(name))'
            )
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
            .select(
                'id, title, category, sub_category, city, budget, budget_min, budget_max, job_type, duration, location_type, status, description, experience_level, created_at, deadline, gender, education_level, skills, client:profiles!client_id(full_name, verified_identity), job_skills(skills(name))'
            )
            .single();

        if (error) throw new Error(error.message);
        return asJobSummary(data as Record<string, any>);
    }
}
