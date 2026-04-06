import type { JobSummary, TelegramLinkStatus, TelegramProfileRole } from '../types';
import { config } from '../config';

function formatBudget(job: JobSummary) {
    if (typeof job.budget === 'number' && job.budget > 0) {
        return `ETB ${job.budget.toLocaleString()}`;
    }

    if (typeof job.budget_min === 'number' || typeof job.budget_max === 'number') {
        const min = typeof job.budget_min === 'number' ? `ETB ${job.budget_min.toLocaleString()}` : 'Open';
        const max = typeof job.budget_max === 'number' ? `ETB ${job.budget_max.toLocaleString()}` : 'Open';
        return `${min} - ${max}`;
    }

    return 'Budget not disclosed';
}

function roleLabel(role: TelegramLinkStatus['role']) {
    if (role === 'service_provider') return 'Service Provider';
    if (role === 'client') return 'Client';
    if (role === 'admin') return 'Admin';
    return 'Not linked';
}

function trustLabel(trustLevel: TelegramLinkStatus['trust_level']) {
    if (trustLevel === 'level_3') return 'Trusted';
    if (trustLevel === 'level_2') return 'Verified';
    if (trustLevel === 'level_1') return 'Pending';
    return 'Not issued';
}

function relativeTime(timestamp?: string | null) {
    if (!timestamp) return 'Recently';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function formatRoleRegistration(role: TelegramProfileRole | 'admin' | null, category: string | null, userLevel: string | null) {
    if (role === 'service_provider') {
        const levelLabel = userLevel
            ? userLevel.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
            : 'Junior';

        return `Registered as a ${levelLabel} Service Provider${category ? ` in ${category}.` : '.'}`;
    }

    if (role === 'client') {
        return `Registered as a Client${category ? ` in ${category}.` : '.'}`;
    }

    if (role === 'admin') {
        return 'Registered as an Admin account.';
    }

    return 'Your Serrale identity is not linked yet.';
}

export function formatWelcomeMessage(status: TelegramLinkStatus) {
    if (!status.linked) {
        return [
            'Welcome to Serrale.',
            '',
            'Telegram is connected. Your Serrale account is not linked yet.',
            'You can browse jobs now, or link your Serrale account to save jobs and get stronger recommendations.',
        ].join('\n');
    }

    return [
        'Serrale on Telegram',
        '',
        `Serrale ID: ${status.serrale_id || 'Pending'}`,
        `${roleLabel(status.role)}${status.main_skill_category ? ` · ${status.main_skill_category}` : ''}`,
        `${status.city || 'Location pending'} · ${trustLabel(status.trust_level)}`,
        '',
        'Use the menu below to browse jobs, save openings, and apply through the compact Telegram flow.',
    ].join('\n');
}

export function formatStatusMessage(status: TelegramLinkStatus) {
    return [
        'Telegram account status',
        '',
        `Telegram: Connected`,
        `Serrale account: ${status.linked ? 'Linked' : 'Not linked'}`,
        `Role: ${roleLabel(status.role)}`,
        `Verification: ${trustLabel(status.trust_level)}`,
        `Saved jobs: ${status.saved_jobs_count}`,
        `Applications: ${status.application_count}`,
        `Last application: ${status.last_application_at ? relativeTime(status.last_application_at) : 'None yet'}`,
        `Intake: ${status.intake_status || 'Not needed'}`,
        `Profile completion: ${Math.max(0, status.profile_completion || 0)}%`,
    ].join('\n');
}

export function formatHelpMessage() {
    return [
        'Serrale Telegram commands',
        '',
        '/start - open Serrale on Telegram',
        '/status - view your link and application status',
        '/jobs - browse open jobs',
        '/saved - view saved jobs',
        '/help - show this help message',
        '/listjobs - admin publish queue',
        '/postjob <jobId> - publish to the Serrale jobs channel',
        '/closejob <jobId> - close a published channel job',
        '/applications <jobId> - list Telegram applications for a job',
        '/applicant <applicationId> - inspect one Telegram application',
        '/markreviewed <applicationId> - mark an application as reviewed',
        '',
        'Use View Details to open the compact Mini App card and Apply to send a lightweight Telegram application with your CV.',
    ].join('\n');
}

export function formatJobList(jobs: JobSummary[], page: number, query?: string, filterLabel?: string) {
    if (jobs.length === 0) {
        return query
            ? `No open jobs matched "${query}" on page ${page}.`
            : `No open jobs found${filterLabel ? ` for ${filterLabel}` : ''} on page ${page}.`;
    }

    const lines = jobs.map((job, index) => {
        return [
            `${index + 1}. ${job.title}`,
            `   ${job.category || 'General'} · ${job.city || job.location_type || 'Remote/Open'} · ${formatBudget(job)}`,
            `   ${job.description?.slice(0, 80) || 'Open Serrale to read the full brief.'}`,
        ].join('\n');
    });

    return [
        query ? `Open Serrale jobs for "${query}"` : 'Open Serrale jobs',
        `${filterLabel ? `Filter: ${filterLabel}` : 'Filter: All'} · Page ${page}`,
        '',
        ...lines,
    ].join('\n');
}

export function formatJobDetail(job: JobSummary, options: { linked: boolean; saved: boolean }) {
    return [
        job.title,
        '',
        `${job.category || 'General'}${job.sub_category ? ` · ${job.sub_category}` : ''}`,
        `Posted: ${relativeTime(job.created_at)}`,
        `Location: ${job.city || job.location_type || 'Remote/Open'}`,
        `Job type: ${job.job_type || 'Project'}`,
        `Budget: ${formatBudget(job)}`,
        `Experience: ${job.experience_level || 'Not specified'}`,
        `Deadline: ${job.deadline || 'Open'}`,
        job.client_verified ? 'Client: Verified' : 'Client: Standard',
        '',
        (job.description || 'Open the full job card to read more.').slice(0, 420),
        '',
        options.linked
            ? `Saved: ${options.saved ? 'Yes' : 'No'}`
            : 'Link your Serrale account to save this job.',
        `Open on Serrale: ${config.serraleWebUrl}/job/${job.id}`,
    ].join('\n');
}

export function formatJobStartSummary(job: JobSummary, status: TelegramLinkStatus) {
    return [
        'Welcome to Serrale.',
        '',
        job.title,
        `${job.category || 'General'} · ${job.city || job.location_type || 'Remote/Open'}`,
        `${formatBudget(job)} · ${job.experience_level || 'Open level'}`,
        '',
        (job.description || 'Open the full job card to continue.').slice(0, 160),
        '',
        status.linked
            ? 'You can view the compact job card, save this job, or apply now.'
            : 'You can view the compact job card now. Link your Serrale account to save jobs.',
    ].join('\n');
}

export function formatIdentityWelcome() {
    return [
        'Welcome to Serrale.',
        '',
        'If you want a fuller Serrale profile inside Telegram, answer a few quick setup questions.',
        '',
        'What is your full name?',
    ].join('\n');
}

export function formatCityPrompt() {
    return 'What city are you in?';
}

export function formatCityOtherPrompt() {
    return 'Type the city you are in.';
}

export function formatRolePrompt() {
    return [
        'What describes you best?',
        '',
        'Choose the path that matches how you will use Serrale.',
    ].join('\n');
}

export function formatCategoryPrompt(role: TelegramProfileRole) {
    if (role === 'client') {
        return 'What type of work do you usually need?';
    }

    return 'What is your main skill area?';
}

export function formatIdentityCompleted(status: TelegramLinkStatus) {
    return [
        'You are in.',
        '',
        `Your Serrale ID: ${status.serrale_id || 'Pending'}`,
        '',
        formatRoleRegistration(status.role, status.main_skill_category, status.user_level),
        '',
        `Your profile is ${Math.max(40, status.profile_completion || 40)}% complete.`,
    ].join('\n');
}

export function formatClientWebHandoff() {
    return [
        'Your Serrale identity is ready.',
        '',
        'Client posting and deeper hiring workflows stay on the Serrale web app in this phase.',
    ].join('\n');
}

export function formatLinkPrompt() {
    return [
        'Link your existing Serrale account from the website to unlock saved jobs and a synced Telegram profile.',
        '',
        'Open Serrale, use the Telegram connect flow, then come back with the secure link token.',
    ].join('\n');
}

export function formatSavedJobsLocked() {
    return [
        'Saving jobs is available after linking your Serrale account.',
        '',
        'You can still browse and open jobs right now.',
    ].join('\n');
}

export function formatChannelCaption(job: JobSummary) {
    return [
        job.title,
        `${job.job_type || 'Project'} · ${job.city || job.location_type || 'Remote/Open'}`,
        `${formatBudget(job)} · ${job.experience_level || 'Open level'}`,
        (job.description || 'Open Serrale for the full job brief.').slice(0, 140),
        '',
        'Tap View Details to open the compact Serrale job flow on Telegram.',
    ].join('\n');
}

export function formatChannelClosedCaption(job: JobSummary) {
    return [
        `Closed on Serrale: ${job.title}`,
        '',
        `${job.job_type || 'Project'} · ${job.city || job.location_type || 'Remote/Open'}`,
        `${formatBudget(job)} · ${job.experience_level || 'Open level'}`,
        '',
        'This opening is no longer accepting new applications.',
    ].join('\n');
}
