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
    return 'Not set';
}

function trustLabel(trustLevel: TelegramLinkStatus['trust_level']) {
    if (trustLevel === 'level_3') return 'Level 3 Trusted';
    if (trustLevel === 'level_2') return 'Level 2 Verified';
    if (trustLevel === 'level_1') return 'Level 1 Default';
    return 'Not issued';
}

function formatRoleRegistration(role: TelegramProfileRole | 'admin' | null, category: string | null, userLevel: string | null) {
    if (role === 'service_provider') {
        const levelLabel = userLevel
            ? userLevel.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
            : 'Junior';

        return `You are registered as a ${levelLabel} Service Provider${category ? ` in the ${category} category.` : '.'}`;
    }

    if (role === 'client') {
        return `You are registered as a Client${category ? ` in the ${category} category.` : '.'}`;
    }

    if (role === 'admin') {
        return 'You are registered as an Admin account.';
    }

    return 'Your Serrale identity is being prepared.';
}

export function formatWelcomeMessage(status: TelegramLinkStatus) {
    if (!status.linked) {
        return [
            'Serrale on Telegram',
            '',
            'Your Telegram account is captured, but your Serrale identity is not complete yet.',
            'Tap Verify Identity to answer 4 quick questions before you browse jobs or apply from Telegram.',
        ].join('\n');
    }

    return [
        'Serrale on Telegram',
        '',
        `Serrale ID: ${status.serrale_id || 'Pending'}`,
        `${roleLabel(status.role)}${status.main_skill_category ? ` · ${status.main_skill_category}` : ''}`,
        `${status.city || 'Location pending'} · ${trustLabel(status.trust_level)}`,
        '',
        'Use the menu below to browse jobs, save opportunities, and manage your Telegram access.',
    ].join('\n');
}

export function formatStatusMessage(status: TelegramLinkStatus) {
    return [
        'Telegram account status',
        '',
        `Serrale ID: ${status.serrale_id || 'Not issued yet'}`,
        `Linked: ${status.linked ? 'Yes' : 'No'}`,
        `Role: ${roleLabel(status.role)}`,
        `City: ${status.city || 'Not provided yet'}`,
        `Category: ${status.main_skill_category || 'Not selected yet'}`,
        `Trust: ${trustLabel(status.trust_level)}`,
        `Profile complete: ${Math.max(0, status.profile_completion || 0)}%`,
        `Saved jobs: ${status.saved_jobs_count}`,
        `Intake: ${status.intake_status || 'None'}`,
        `Name: ${status.full_name || 'Unknown'}`,
    ].join('\n');
}

export function formatHelpMessage() {
    return [
        'Serrale Telegram commands',
        '',
        '/start - open the Serrale Telegram home',
        '/status - view your Serrale Telegram identity status',
        '/help - show this help message',
        '/listjobs - admin publish queue',
        '/postjob <jobId> - publish a Serrale job to the jobs channel',
        '/closejob <jobId> - close a published job and update the channel post',
        '',
        'Identity verification runs in the private bot before browsing or applying from Telegram.',
    ].join('\n');
}

export function formatJobList(jobs: JobSummary[], page: number, query?: string) {
    if (jobs.length === 0) {
        return query
            ? `No open jobs matched "${query}" on page ${page}.`
            : `No open jobs found on page ${page}.`;
    }

    const lines = jobs.map((job, index) => {
        return [
            `${index + 1}. ${job.title}`,
            `   ${job.category || 'General'} | ${job.city || job.location_type || 'Remote/Open'} | ${formatBudget(job)}`,
        ].join('\n');
    });

    return [
        query ? `Open Serrale jobs for "${query}"` : 'Open Serrale jobs',
        `Page ${page}`,
        '',
        ...lines,
    ].join('\n');
}

export function formatJobDetail(job: JobSummary, options: { linked: boolean; saved: boolean }) {
    return [
        job.title,
        '',
        `Category: ${job.category || 'General'}`,
        `Location: ${job.city || job.location_type || 'Remote/Open'}`,
        `Budget: ${formatBudget(job)}`,
        `Type: ${job.job_type || 'Project'}`,
        `Duration: ${job.duration || 'Not specified'}`,
        `Experience: ${job.experience_level || 'Not specified'}`,
        '',
        job.description?.slice(0, 700) || 'No description available yet.',
        '',
        options.linked
            ? `Saved on Telegram: ${options.saved ? 'Yes' : 'No'}`
            : 'Complete identity verification in Telegram before you apply or save jobs here.',
        `Open on Serrale: ${config.serraleWebUrl}/job/${job.id}`,
    ].join('\n');
}

export function formatIdentityWelcome() {
    return [
        'Welcome to Serrale.',
        '',
        'Before you can apply for opportunities or browse projects,',
        'we need to confirm a few things. It takes 60 seconds.',
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
        `Your profile is ${Math.max(40, status.profile_completion || 40)}% complete. The more you add, the better your recommendations will be.`,
    ].join('\n');
}

export function formatClientWebHandoff() {
    return [
        'Your Serrale identity is ready.',
        '',
        'Client project posting stays on the Serrale web app in phase 1.',
        'Use Open Serrale App or Complete Profile to continue there.',
    ].join('\n');
}

export function formatChannelCaption(job: JobSummary) {
    return [
        `Serrale Job: ${job.title}`,
        '',
        `Category: ${job.category || 'General'}`,
        `Location: ${job.city || job.location_type || 'Remote/Open'}`,
        `Budget: ${formatBudget(job)}`,
        '',
        (job.description || 'Open the full job on Serrale for the complete brief.').slice(0, 350),
        '',
        'Tap Apply in Bot. Serrale will confirm identity in private chat before you continue.',
    ].join('\n');
}

export function formatChannelClosedCaption(job: JobSummary) {
    return [
        `Closed on Serrale: ${job.title}`,
        '',
        `Category: ${job.category || 'General'}`,
        `Location: ${job.city || job.location_type || 'Remote/Open'}`,
        `Budget: ${formatBudget(job)}`,
        '',
        'This opening is no longer accepting new proposals.',
    ].join('\n');
}
