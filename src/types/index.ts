import type { Context } from 'telegraf';

export const ONBOARDING_STEPS = ['full_name', 'city', 'city_other', 'role', 'category'] as const;
export const TELEGRAM_CITY_OPTIONS = ['Addis Ababa', 'Dire Dawa', 'Hawassa', 'Other'] as const;
export const TELEGRAM_CATEGORY_OPTIONS = [
    'Graphic Design',
    'Video Editing',
    'Web Development',
    'Digital Marketing',
    'Writing',
    'UI/UX Design',
    'Photography',
    'Other',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export type TelegramCityOption = (typeof TELEGRAM_CITY_OPTIONS)[number];
export type TelegramCategoryOption = (typeof TELEGRAM_CATEGORY_OPTIONS)[number];
export type ChannelPostStatus = 'posted' | 'closed';
export type TelegramRegistrationSource = 'telegram_bot';
export type TelegramProfileRole = 'service_provider' | 'client';
export type TelegramTrustLevel = 'level_1' | 'level_2' | 'level_3';

export interface TelegramUserRecord {
    id?: string;
    telegram_user_id: string;
    chat_id: string | null;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    language_code: string | null;
    is_bot: boolean;
    profile_id: string | null;
    current_intake_id: string | null;
    linked_at?: string | null;
    last_seen_at?: string | null;
}

export interface TelegramLinkStatus {
    linked: boolean;
    role: TelegramProfileRole | 'admin' | null;
    profile_id: string | null;
    serrale_id: string | null;
    intake_status: string | null;
    saved_jobs_count: number;
    intake_id: string | null;
    full_name: string | null;
    city: string | null;
    main_skill_category: string | null;
    user_level: string | null;
    profile_completion: number;
    trust_level: TelegramTrustLevel | null;
}

export interface JobSummary {
    id: string;
    title: string;
    category: string | null;
    city: string | null;
    budget: number | null;
    budget_min: number | null;
    budget_max: number | null;
    job_type: string | null;
    duration: string | null;
    location_type?: string | null;
    status?: string | null;
    description?: string | null;
    experience_level?: string | null;
    saved?: boolean;
    created_at?: string;
}

export interface PublishableJob extends JobSummary {
    client_name: string | null;
    active_post_count: number;
}

export interface TelegramSessionState {
    telegram_user_id: string;
    scene_key: string;
    step_key: OnboardingStep;
    payload: Record<string, unknown>;
    expires_at: string;
}

export interface OnboardingDraft {
    full_name?: string;
    city?: string | null;
    role?: TelegramProfileRole;
    main_skill_category?: string | null;
    pending_job_id?: string | null;
}

export type CallbackAction =
    | `menu:${'home' | 'jobs' | 'status' | 'onboard' | 'help'}`
    | `jobs:page:${number}`
    | `job:view:${string}:${number}`
    | `job:save:${string}:${number}`
    | `job:unsave:${string}:${number}`
    | `onboard:city:${string}`
    | `onboard:role:${TelegramProfileRole}`
    | `onboard:category:${string}`
    | `admin:jobs:${number}`
    | `admin:publish:${string}`
    | `admin:close:${string}`;

export type SerraleBotContext = Context & {
    state: {
        telegramUser?: TelegramUserRecord | null;
    };
};
