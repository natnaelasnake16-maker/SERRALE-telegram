import { Markup } from 'telegraf';
import { config } from '../config';
import type {
    JobSummary,
    PublishableJob,
    TelegramCategoryOption,
    TelegramProfileRole,
} from '../types';

function profileUrlForRole(role: TelegramProfileRole | 'admin' | null) {
    if (role === 'client') {
        return `${config.serraleWebUrl}/profile/client`;
    }

    return `${config.serraleWebUrl}/profile/provider`;
}

export function mainMenuKeyboard(options: { linked: boolean; isAdmin: boolean; role?: TelegramProfileRole | 'admin' | null }) {
    const rows: any[][] = [];

    if (options.linked && options.role === 'client') {
        rows.push([
            Markup.button.url('Complete Profile', profileUrlForRole('client')),
            Markup.button.callback('My Status', 'menu:status'),
        ]);
    } else if (options.linked) {
        rows.push([
            Markup.button.callback('Browse Jobs', 'menu:jobs'),
            Markup.button.callback('My Status', 'menu:status'),
        ]);
    } else {
        rows.push([
            Markup.button.callback('Verify Identity', 'menu:onboard'),
            Markup.button.callback('My Status', 'menu:status'),
        ]);
    }

    rows.push([
        Markup.button.url('Open Serrale App', config.serraleWebUrl),
        Markup.button.callback('Help', 'menu:help'),
    ]);

    if (options.isAdmin) {
        rows.push([Markup.button.callback('Admin Queue', 'admin:jobs:1')]);
    }

    return Markup.inlineKeyboard(rows);
}

export function jobsListKeyboard(jobs: JobSummary[], page: number, hasNextPage: boolean) {
    const rows: any[][] = jobs.map((job) => [
        Markup.button.callback(`Open ${job.title.slice(0, 36)}`, `job:view:${job.id}:${page}`),
    ]);
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
            Markup.button.url('Apply on Web', `${config.serraleWebUrl}/job/${options.jobId}`),
            Markup.button.url('Open Serrale App', `${config.serraleWebUrl}/job/${options.jobId}`),
        ],
    ];

    if (options.linked) {
        rows.push([
            Markup.button.callback(
                options.saved ? 'Remove Saved Job' : 'Save Job',
                `${options.saved ? 'job:unsave' : 'job:save'}:${options.jobId}:${options.page}`
            ),
        ]);
    }

    rows.push([
        Markup.button.callback('Back to Jobs', `jobs:page:${options.page}`),
        Markup.button.callback('Main Menu', 'menu:home'),
    ]);

    return Markup.inlineKeyboard(rows);
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
            Markup.button.url('Open Serrale App', config.serraleWebUrl),
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
        Markup.button.callback(`Post ${job.title.slice(0, 30)}`, `admin:publish:${job.id}`),
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
        [Markup.button.callback('Admin Queue', 'admin:jobs:1')],
    ]);
}

export function channelPostKeyboard(jobId: string, options?: { closed?: boolean }) {
    return Markup.inlineKeyboard([
        [
            Markup.button.url(
                options?.closed ? 'Open on Serrale' : 'Apply in Bot',
                options?.closed
                    ? `${config.serraleWebUrl}/job/${jobId}`
                    : `https://t.me/${config.telegramBotUsername}?start=apply_${jobId}`
            ),
            Markup.button.url('Open Serrale App', `${config.serraleWebUrl}/job/${jobId}`),
        ],
    ]);
}
