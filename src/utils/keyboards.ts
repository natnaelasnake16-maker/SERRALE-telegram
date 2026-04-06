import { Markup } from 'telegraf';
import { config } from '../config';
import type {
    JobFilterKey,
    JobSummary,
    PublishableJob,
    TelegramCategoryOption,
    TelegramBotState,
    TelegramProfileRole,
} from '../types';

function profileUrlForRole(role: TelegramProfileRole | 'admin' | null) {
    if (role === 'client') {
        return `${config.serraleWebUrl}/profile/client`;
    }

    return `${config.serraleWebUrl}/profile/provider`;
}

function botStartUrl(payload?: string) {
    return `https://t.me/${config.telegramBotUsername}${payload ? `?start=${encodeURIComponent(payload)}` : ''}`;
}

function miniAppUrl(options?: { jobId?: string; view?: 'job' | 'apply' | 'status' }) {
    const params = new URLSearchParams();
    if (options?.jobId) params.set('jobId', options.jobId);
    params.set('view', options?.view || 'job');
    return `${config.telegramAppUrl}/mini-app?${params.toString()}`;
}

export function mainMenuKeyboard(options: {
    linked: boolean;
    isAdmin: boolean;
    role?: TelegramProfileRole | 'admin' | null;
    state?: TelegramBotState;
}) {
    const rows: any[][] = [];

    if (!options.linked && options.state === 'intake') {
        rows.push([
            Markup.button.callback('Continue Onboarding', 'intake:continue'),
            Markup.button.callback('Browse Jobs', 'menu:jobs'),
        ]);
        rows.push([
            Markup.button.callback('My Status', 'menu:status'),
            Markup.button.callback('Help', 'menu:help'),
        ]);
    } else if (!options.linked) {
        rows.push([
            Markup.button.callback('Browse Jobs', 'menu:jobs'),
            Markup.button.callback('Start Onboarding', 'intake:start'),
        ]);
        rows.push([
            Markup.button.callback('My Status', 'menu:status'),
            Markup.button.callback('Link Existing Serrale Account', 'link:start'),
        ]);
        rows.push([Markup.button.callback('Help', 'menu:help')]);
    } else if (options.role === 'client') {
        rows.push([
            Markup.button.url('Post on Serrale', `${config.serraleWebUrl}/post-job`),
            Markup.button.url('Browse Providers later', `${config.serraleWebUrl}/browse-talent`),
        ]);
        rows.push([
            Markup.button.webApp('Open Mini App', miniAppUrl({ view: 'status' })),
            Markup.button.callback('My Status', 'menu:status'),
        ]);
        rows.push([Markup.button.callback('Help', 'menu:help')]);
    } else {
        rows.push([
            Markup.button.callback('Recommended Jobs', 'menu:recommended'),
            Markup.button.callback('Browse Jobs', 'menu:jobs'),
        ]);
        rows.push([
            Markup.button.callback('Saved Jobs', 'menu:saved'),
            Markup.button.callback('My Status', 'menu:status'),
        ]);
        rows.push([
            Markup.button.webApp('Open Mini App', miniAppUrl({ view: 'status' })),
            Markup.button.callback('Help', 'menu:help'),
        ]);
    }

    if (options.isAdmin) {
        rows.push([
            Markup.button.callback('Publish Queue', 'admin:listjobs'),
            Markup.button.callback('Bot Status', 'menu:status'),
        ]);
    }

    return Markup.inlineKeyboard(rows);
}

export function jobsFilterKeyboard(active: JobFilterKey) {
    const filters: Array<{ label: string; value: JobFilterKey }> = [
        { label: 'All', value: 'all' },
        { label: 'Nearby', value: 'nearby' },
        { label: 'Remote', value: 'remote' },
        { label: 'Recent', value: 'recent' },
        { label: 'My Category', value: 'my_category' },
    ];

    return Markup.inlineKeyboard([
        filters.map((filter) =>
            Markup.button.callback(
                filter.value === active ? `• ${filter.label}` : filter.label,
                `jobs:filter:${filter.value}`
            )
        ),
    ]);
}

export function jobsListKeyboard(
    jobs: JobSummary[],
    page: number,
    hasNextPage: boolean,
    options?: { linked?: boolean; filter?: JobFilterKey }
) {
    const rows: any[][] = [];

    if (options?.filter) {
        rows.push(
            [
                { label: 'All', value: 'all' },
                { label: 'Nearby', value: 'nearby' },
                { label: 'Remote', value: 'remote' },
                { label: 'Recent', value: 'recent' },
                { label: 'My Category', value: 'my_category' },
            ].map((filter) =>
                Markup.button.callback(
                    filter.value === options.filter ? `• ${filter.label}` : filter.label,
                    `jobs:filter:${filter.value}`
                )
            )
        );
    }

    jobs.forEach((job) => {
        rows.push([
            Markup.button.callback('View', `job:view:${job.id}`),
            Markup.button.callback('Apply', `job:apply:${job.id}`),
            Markup.button.callback(
                job.saved ? 'Unsave' : 'Save',
                `${job.saved ? 'job:unsave' : 'job:save'}:${job.id}:${page}`
            ),
        ]);
    });

    const pager: any[] = [];
    if (page > 1) pager.push(Markup.button.callback('Prev', `jobs:page:${page - 1}`));
    if (hasNextPage) pager.push(Markup.button.callback('Next', `jobs:page:${page + 1}`));
    if (pager.length > 0) rows.push(pager);

    rows.push([Markup.button.callback('Main Menu', 'menu:home')]);
    return Markup.inlineKeyboard(rows);
}

export function jobDetailKeyboard(options: { jobId: string; page: number; linked: boolean; saved: boolean }) {
    const rows: any[][] = [
        [
            Markup.button.webApp('View Details', miniAppUrl({ jobId: options.jobId, view: 'job' })),
            Markup.button.webApp('Apply', miniAppUrl({ jobId: options.jobId, view: 'apply' })),
        ],
        [
            Markup.button.url('Open on Serrale', `${config.serraleWebUrl}/job/${options.jobId}`),
            Markup.button.callback('Share', `job:share:${options.jobId}`),
        ],
    ];

    rows.push([
        Markup.button.callback(
            options.saved ? 'Unsave' : options.linked ? 'Save' : 'Link to Save',
            options.linked ? `${options.saved ? 'job:unsave' : 'job:save'}:${options.jobId}:${options.page}` : 'link:start'
        ),
    ]);

    rows.push([
        Markup.button.callback('Back to Jobs', `jobs:page:${options.page}`),
        Markup.button.callback('Main Menu', 'menu:home'),
    ]);

    return Markup.inlineKeyboard(rows);
}

export function jobStartKeyboard(options: { jobId: string; linked: boolean; saved: boolean }) {
    return Markup.inlineKeyboard([
        [
            Markup.button.webApp('View Details', miniAppUrl({ jobId: options.jobId, view: 'job' })),
            Markup.button.webApp('Apply', miniAppUrl({ jobId: options.jobId, view: 'apply' })),
        ],
        [
            Markup.button.callback(
                options.linked ? (options.saved ? 'Unsave' : 'Save') : 'Link to Save',
                options.linked ? `${options.saved ? 'job:unsave' : 'job:save'}:${options.jobId}:1` : 'link:start'
            ),
            Markup.button.url('Open on Serrale', `${config.serraleWebUrl}/job/${options.jobId}`),
        ],
    ]);
}

export function onboardingCityKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('Addis Ababa', 'onboard:city:Addis Ababa'),
            Markup.button.callback('Dire Dawa', 'onboard:city:Dire Dawa'),
        ],
        [
            Markup.button.callback('Hawassa', 'onboard:city:Hawassa'),
            Markup.button.callback('Other', 'onboard:city:Other'),
        ],
        [Markup.button.callback('Main Menu', 'menu:home')],
    ]);
}

export function onboardingRoleKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('Service Provider', 'onboard:role:service_provider')],
        [Markup.button.callback('Client', 'onboard:role:client')],
        [Markup.button.callback('Main Menu', 'menu:home')],
    ]);
}

export function onboardingCategoryKeyboard() {
    const categories: TelegramCategoryOption[] = [
        'Graphic Design',
        'Video Editing',
        'Web Development',
        'Digital Marketing',
        'Writing',
        'UI/UX Design',
        'Photography',
        'Other',
    ];

    const rows: any[][] = [];
    for (let index = 0; index < categories.length; index += 2) {
        rows.push(
            categories.slice(index, index + 2).map((category) =>
                Markup.button.callback(category, `onboard:category:${category}`)
            )
        );
    }

    rows.push([Markup.button.callback('Main Menu', 'menu:home')]);
    return Markup.inlineKeyboard(rows);
}

export function identityCompletedKeyboard(role: TelegramProfileRole | 'admin' | null) {
    const rows: any[][] = [
        [
            Markup.button.webApp('Open Mini App', miniAppUrl({ view: 'status' })),
            Markup.button.url('Complete Profile', profileUrlForRole(role)),
        ],
    ];

    if (role !== 'client') {
        rows.push([Markup.button.callback('Browse Jobs', 'menu:jobs')]);
    }

    return Markup.inlineKeyboard(rows);
}

export function adminJobsKeyboard(jobs: PublishableJob[], page: number, hasNextPage: boolean) {
    const rows: any[][] = jobs.map((job) => [
        Markup.button.callback(`Post ${job.title.slice(0, 26)}`, `admin:publish:${job.id}`),
        Markup.button.webApp('Preview', miniAppUrl({ jobId: job.id, view: 'job' })),
    ]);
    const pager: any[] = [];

    if (page > 1) pager.push(Markup.button.callback('Prev', `admin:jobs:${page - 1}`));
    if (hasNextPage) pager.push(Markup.button.callback('Next', `admin:jobs:${page + 1}`));
    if (pager.length > 0) rows.push(pager);

    rows.push([Markup.button.callback('Main Menu', 'menu:home')]);
    return Markup.inlineKeyboard(rows);
}

export function adminPublishedJobKeyboard(jobId: string) {
    return Markup.inlineKeyboard([
        [Markup.button.callback('Close Job', `admin:close:${jobId}`)],
        [Markup.button.callback('Publish Queue', 'admin:listjobs')],
    ]);
}

export function channelPostKeyboard(jobId: string, options?: { closed?: boolean }) {
    return Markup.inlineKeyboard([
        [
            Markup.button.url(
                'View Details',
                options?.closed ? `${config.serraleWebUrl}/job/${jobId}` : botStartUrl(`job_${jobId}`)
            ),
            Markup.button.url('Open on Serrale', `${config.serraleWebUrl}/job/${jobId}`),
            Markup.button.url('Start Bot', botStartUrl(options?.closed ? undefined : `job_${jobId}`)),
        ],
    ]);
}
