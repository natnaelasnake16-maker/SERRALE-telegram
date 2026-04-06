import {
    formatCategoryPrompt,
    formatCityOtherPrompt,
    formatCityPrompt,
    formatClientWebHandoff,
    formatIdentityCompleted,
    formatIdentityWelcome,
    formatJobDetail,
    formatRolePrompt,
} from '../../utils/formatters';
import {
    identityCompletedKeyboard,
    jobDetailKeyboard,
    mainMenuKeyboard,
    onboardingCategoryKeyboard,
    onboardingCityKeyboard,
    onboardingRoleKeyboard,
} from '../../utils/keyboards';
import type { OnboardingDraft, SerraleBotContext, TelegramProfileRole } from '../../types';
import { JobService } from '../../services/job.service';
import { UserService } from '../../services/user.service';
import { hasAdminAccess } from '../middleware/auth';

async function mainMenuFor(ctx: SerraleBotContext) {
    const telegramUserId = String(ctx.from?.id || '');
    const status = await UserService.getLinkStatus(telegramUserId);
    const isAdmin = await hasAdminAccess(telegramUserId);
    return mainMenuKeyboard({ linked: status.linked, isAdmin, role: status.role });
}

async function sendPendingJob(ctx: SerraleBotContext, profileId: string | null, pendingJobId: string | null | undefined) {
    if (!pendingJobId) {
        return;
    }

    const job = await JobService.getJobById(pendingJobId, profileId);
    if (!job) {
        return;
    }

    await ctx.reply(
        formatJobDetail(job, {
            linked: Boolean(profileId),
            saved: Boolean(job.saved),
        }),
        jobDetailKeyboard({
            jobId: job.id,
            page: 1,
            linked: Boolean(profileId),
            saved: Boolean(job.saved),
        })
    );
}

export async function beginOnboarding(ctx: SerraleBotContext, options?: { pendingJobId?: string | null }) {
    const telegramUserId = String(ctx.from?.id || '');
    const sessionDraft: OnboardingDraft = {
        pending_job_id: options?.pendingJobId || null,
    };

    await UserService.setSession(telegramUserId, 'onboarding', 'full_name', sessionDraft as Record<string, unknown>);
    await ctx.reply(formatIdentityWelcome());
}

export async function handleCitySelection(ctx: SerraleBotContext, city: string) {
    const telegramUserId = String(ctx.from?.id || '');
    const session = await UserService.getSession(telegramUserId);
    const draft = { ...((session?.payload as OnboardingDraft) || {}) };

    if (city === 'Other') {
        await UserService.setSession(telegramUserId, 'onboarding', 'city_other', draft as Record<string, unknown>);
        await ctx.reply(formatCityOtherPrompt());
        return;
    }

    draft.city = city;
    await UserService.setSession(telegramUserId, 'onboarding', 'role', draft as Record<string, unknown>);
    await ctx.reply(formatRolePrompt(), onboardingRoleKeyboard());
}

export async function handleRoleSelection(ctx: SerraleBotContext, role: TelegramProfileRole) {
    const telegramUserId = String(ctx.from?.id || '');
    const session = await UserService.getSession(telegramUserId);
    const draft = {
        ...((session?.payload as OnboardingDraft) || {}),
        role,
    };

    await UserService.setSession(telegramUserId, 'onboarding', 'category', draft as Record<string, unknown>);
    await ctx.reply(formatCategoryPrompt(role), onboardingCategoryKeyboard());
}

export async function handleCategorySelection(ctx: SerraleBotContext, category: string) {
    const telegramUserId = String(ctx.from?.id || '');
    const session = await UserService.getSession(telegramUserId);
    const draft = {
        ...((session?.payload as OnboardingDraft) || {}),
        main_skill_category: category,
    };

    const result = await UserService.completeIdentityOnboarding(telegramUserId, draft);
    await UserService.clearSession(telegramUserId);
    await ctx.reply(formatIdentityCompleted(result.status), identityCompletedKeyboard(result.status.role));

    if (result.status.role === 'client') {
        await ctx.reply(formatClientWebHandoff(), await mainMenuFor(ctx));
        return;
    }

    await sendPendingJob(ctx, result.status.profile_id, draft.pending_job_id);
}

export async function handleOnboardingText(ctx: SerraleBotContext) {
    const telegramUserId = String(ctx.from?.id || '');
    const session = await UserService.getSession(telegramUserId);

    if (!session || session.scene_key !== 'onboarding' || !ctx.message || !('text' in ctx.message)) {
        return false;
    }

    const text = ctx.message.text.trim();
    if (!text) {
        return true;
    }

    const draft = { ...(session.payload as OnboardingDraft) };

    if (session.step_key === 'full_name') {
        draft.full_name = text;
        await UserService.setSession(telegramUserId, 'onboarding', 'city', draft as Record<string, unknown>);
        await ctx.reply(formatCityPrompt(), onboardingCityKeyboard());
        return true;
    }

    if (session.step_key === 'city_other') {
        draft.city = text;
        await UserService.setSession(telegramUserId, 'onboarding', 'role', draft as Record<string, unknown>);
        await ctx.reply(formatRolePrompt(), onboardingRoleKeyboard());
        return true;
    }

    return false;
}
