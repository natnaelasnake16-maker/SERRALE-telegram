import crypto from 'crypto';
import type { User as TelegramFrom } from 'telegraf/types';
import { normalizeProviderClassification } from '../shared/providerCatalog';
import type {
    OnboardingDraft,
    OnboardingStep,
    SerraleBotContext,
    TelegramLinkStatus,
    TelegramProfileRole,
    TelegramSessionState,
    TelegramTrustLevel,
    TelegramUserRecord,
} from '../types';
import { supabase } from './supabase';

const SESSION_TTL_HOURS = 24;
const DEFAULT_PROFILE_COMPLETION = 40;
const MISSING_COLUMN_IN_SCHEMA_CACHE = /could not find the ['"]([^'"]+)['"] column of ['"]([^'"]+)['"]/i;
const MISSING_COLUMN_IN_RELATION = /column ['"]?([^'"\s]+)['"]? of relation ['"]?([^'"\s]+)['"]? does not exist/i;
const MISSING_QUALIFIED_COLUMN = /column ['"]?([^'"\s]+)\.([^'"\s]+)['"]? does not exist/i;
const MISSING_GENERIC_COLUMN = /column ['"]?([^'"\s]+)['"]? does not exist/i;

type LooseRecord = Record<string, any>;

function nowIso() {
    return new Date().toISOString();
}

function expiryIso(hours = SESSION_TTL_HOURS) {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function tokenHash(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function cleanText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function cleanNullable(value: unknown) {
    const text = cleanText(value);
    return text || null;
}

function asNumber(...values: unknown[]) {
    for (const value of values) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            return numeric;
        }
    }

    return 0;
}

function asStringArray(value: unknown) {
    if (Array.isArray(value)) {
        return value.map((entry) => cleanText(entry)).filter(Boolean);
    }

    return [];
}

function sanitizeWritePayload(payload: LooseRecord) {
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function parseMissingColumn(error: { message?: string | null; details?: string | null } | null | undefined, table: string) {
    const message = `${error?.message || ''} ${error?.details || ''}`;

    const schemaCacheMatch = message.match(MISSING_COLUMN_IN_SCHEMA_CACHE);
    if (schemaCacheMatch) {
        const [, column, relation] = schemaCacheMatch;
        if (relation.toLowerCase() === table.toLowerCase()) {
            return column;
        }
    }

    const relationMatch = message.match(MISSING_COLUMN_IN_RELATION);
    if (relationMatch) {
        const [, column, relation] = relationMatch;
        if (relation.toLowerCase() === table.toLowerCase()) {
            return column;
        }
    }

    const qualifiedMatch = message.match(MISSING_QUALIFIED_COLUMN);
    if (qualifiedMatch) {
        const [, relation, column] = qualifiedMatch;
        if (relation.toLowerCase() === table.toLowerCase()) {
            return column;
        }
    }

    if (message.toLowerCase().includes(`relation "${table.toLowerCase()}"`)) {
        const genericMatch = message.match(MISSING_GENERIC_COLUMN);
        if (genericMatch) {
            return genericMatch[1];
        }
    }

    return null;
}

function isProviderRole(role: unknown) {
    const normalized = cleanText(role).toLowerCase();
    return normalized === 'service_provider' || normalized === 'provider' || normalized === 'freelancer';
}

function trustLevelFromProfile(profile: LooseRecord | null): TelegramTrustLevel | null {
    if (!profile) return null;

    const rating = asNumber(profile.rating, profile.average_rating, profile.avg_rating);
    const completedContracts = asNumber(profile.completed_contracts, profile.completed_jobs, profile.total_jobs);
    const reviews = Array.isArray(profile.reviews) ? profile.reviews.length : 0;

    if (completedContracts > 0 || rating > 0 || reviews > 0) {
        return 'level_3';
    }

    if (profile.verified_identity === true || profile.verified === true) {
        return 'level_2';
    }

    return 'level_1';
}

function completionFromProfile(profile: LooseRecord | null) {
    if (!profile) return 0;

    const explicit = asNumber(profile.completeness_score, profile.completion_percentage);
    if (explicit > 0) {
        return explicit;
    }

    const hasIdentity = Boolean(
        cleanText(profile.full_name || profile.name) &&
        cleanText(profile.location_city || profile.city) &&
        cleanText(profile.main_skill_category || profile.category)
    );

    return hasIdentity ? DEFAULT_PROFILE_COMPLETION : 0;
}

function existingRole(profile: LooseRecord | null, fallback: TelegramProfileRole) {
    if (!profile) return fallback;
    const role = cleanText(profile.role).toLowerCase();
    return role === 'client' ? 'client' : fallback;
}

function buildCompletedSections(role: TelegramProfileRole) {
    if (role === 'client') {
        return {
            identity: true,
            needs: true,
        };
    }

    return {
        identity: true,
        specialization: true,
    };
}

function buildProfileCompletion(role: TelegramProfileRole) {
    if (role === 'client') {
        return {
            identity: true,
            business: false,
            needs: true,
            payment: false,
        };
    }

    return {
        identity: true,
        specialization: true,
        portfolio: false,
        'public-readiness': false,
        verification: false,
    };
}

async function reserveSerraleId() {
    const { data, error } = await supabase.rpc('next_serrale_profile_id');
    if (error) throw new Error(error.message);
    return cleanText(data) || null;
}

async function getProfile(profileId: string | null | undefined) {
    if (!profileId) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as LooseRecord | null) || null;
}

async function writeProfileWithSchemaFallback(payload: LooseRecord) {
    let candidatePayload = sanitizeWritePayload(payload);
    const attemptedStrip = new Set<string>();

    for (;;) {
        const { data, error } = await supabase
            .from('profiles')
            .upsert(candidatePayload, { onConflict: 'id' })
            .select('*')
            .single();

        if (!error) {
            return data as LooseRecord;
        }

        const missingColumn = parseMissingColumn(error, 'profiles');
        if (!missingColumn || !Object.prototype.hasOwnProperty.call(candidatePayload, missingColumn) || attemptedStrip.has(missingColumn)) {
            throw new Error(error.message);
        }

        attemptedStrip.add(missingColumn);
        const nextPayload = { ...candidatePayload };
        delete nextPayload[missingColumn];
        candidatePayload = nextPayload;
    }
}

async function getIntakeById(intakeId: string | null | undefined) {
    if (!intakeId) return null;

    const { data, error } = await supabase
        .from('registration_intakes')
        .select('*')
        .eq('id', intakeId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as LooseRecord | null) || null;
}

export class UserService {
    static async upsertTelegramUser(from: TelegramFrom | undefined, chatId?: number | string | null): Promise<TelegramUserRecord | null> {
        if (!from) return null;

        const payload = {
            telegram_user_id: String(from.id),
            chat_id: chatId != null ? String(chatId) : null,
            username: from.username || null,
            first_name: from.first_name || null,
            last_name: from.last_name || null,
            language_code: from.language_code || null,
            is_bot: Boolean(from.is_bot),
            last_seen_at: nowIso(),
            updated_at: nowIso(),
        };

        const { data, error } = await supabase
            .from('telegram_users')
            .upsert(payload, { onConflict: 'telegram_user_id' })
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        return data as TelegramUserRecord;
    }

    static async getTelegramUser(telegramUserId: string) {
        const { data, error } = await supabase
            .from('telegram_users')
            .select('*')
            .eq('telegram_user_id', telegramUserId)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return (data as TelegramUserRecord | null) || null;
    }

    static async getLinkStatus(telegramUserId: string): Promise<TelegramLinkStatus> {
        const telegramUser = await this.getTelegramUser(telegramUserId);
        if (!telegramUser) {
            return {
                linked: false,
                role: null,
                profile_id: null,
                serrale_id: null,
                intake_status: null,
                saved_jobs_count: 0,
                intake_id: null,
                full_name: null,
                phone: null,
                email: null,
                city: null,
                main_skill_category: null,
                user_level: null,
                profile_completion: 0,
                trust_level: null,
                application_count: 0,
                last_application_at: null,
                state: 'unknown',
                is_admin: false,
            };
        }

        let profile: LooseRecord | null = null;
        let savedJobsCount = 0;

        if (telegramUser.profile_id) {
            const [{ data: profileData, error: profileError }, { count, error: savedError }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', telegramUser.profile_id).maybeSingle(),
                supabase
                    .from('saved_jobs')
                    .select('job_id', { count: 'exact', head: true })
                    .eq('profile_id', telegramUser.profile_id),
            ]);

            if (profileError) throw new Error(profileError.message);
            if (savedError) throw new Error(savedError.message);
            profile = (profileData as LooseRecord | null) || null;
            savedJobsCount = count || 0;
        }

        const { data: applicationRows, error: applicationError } = await supabase
            .from('telegram_job_applications')
            .select('submitted_at')
            .eq('telegram_user_id', telegramUserId)
            .order('submitted_at', { ascending: false });

        if (applicationError) throw new Error(applicationError.message);

        let intake: LooseRecord | null = null;
        if (telegramUser.current_intake_id) {
            intake = await getIntakeById(telegramUser.current_intake_id);
        } else if (telegramUser.profile_id && isProviderRole(profile?.role)) {
            const { data, error } = await supabase
                .from('registration_intakes')
                .select('*')
                .eq('profile_id', telegramUser.profile_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw new Error(error.message);
            intake = (data as LooseRecord | null) || null;
        }

        const fallbackName = cleanNullable(`${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`);
        const city = cleanNullable(profile?.location_city || profile?.city || intake?.city);
        const role = cleanText(profile?.role).toLowerCase();
        const isAdmin = role === 'admin';
        const state = telegramUser.profile_id
            ? role === 'client'
                ? 'linked_client'
                : 'linked_provider'
            : telegramUser.current_intake_id
              ? 'intake'
              : 'unknown';

        return {
            linked: Boolean(telegramUser.profile_id),
            role: isAdmin ? 'admin' : role === 'client' ? 'client' : role ? 'service_provider' : null,
            profile_id: telegramUser.profile_id,
            serrale_id: cleanNullable(profile?.serrale_id),
            intake_status: cleanNullable(intake?.intake_status),
            saved_jobs_count: savedJobsCount,
            intake_id: cleanNullable(intake?.id || telegramUser.current_intake_id),
            full_name: cleanNullable(profile?.full_name || profile?.name || intake?.full_name) || fallbackName,
            phone: cleanNullable(profile?.phone || intake?.phone),
            email: cleanNullable(profile?.email || intake?.email),
            city,
            main_skill_category: cleanNullable(profile?.main_skill_category || intake?.main_skill_category || profile?.category),
            user_level: cleanNullable(profile?.user_level || intake?.user_level),
            profile_completion: completionFromProfile(profile),
            trust_level: trustLevelFromProfile(profile),
            application_count: (applicationRows || []).length,
            last_application_at: applicationRows?.[0]?.submitted_at || null,
            state,
            is_admin: isAdmin,
        };
    }

    static async isAdmin(telegramUserId: string) {
        const telegramUser = await this.getTelegramUser(telegramUserId);
        if (!telegramUser?.profile_id) {
            return false;
        }

        const profile = await getProfile(telegramUser.profile_id);
        return cleanText(profile?.role).toLowerCase() === 'admin';
    }

    static async getSession(telegramUserId: string): Promise<TelegramSessionState | null> {
        const { data, error } = await supabase
            .from('telegram_session_state')
            .select('telegram_user_id, scene_key, step_key, payload, expires_at')
            .eq('telegram_user_id', telegramUserId)
            .maybeSingle();

        if (error) throw new Error(error.message);
        if (!data) return null;
        if (new Date(String(data.expires_at)).getTime() <= Date.now()) {
            await this.clearSession(telegramUserId);
            return null;
        }

        return {
            telegram_user_id: String(data.telegram_user_id),
            scene_key: String(data.scene_key),
            step_key: data.step_key as OnboardingStep,
            payload: (data.payload as Record<string, unknown>) || {},
            expires_at: String(data.expires_at),
        };
    }

    static async setSession(
        telegramUserId: string,
        sceneKey: string,
        stepKey: OnboardingStep,
        payload: Record<string, unknown> = {}
    ) {
        const { error } = await supabase.from('telegram_session_state').upsert(
            {
                telegram_user_id: telegramUserId,
                scene_key: sceneKey,
                step_key: stepKey,
                payload,
                expires_at: expiryIso(),
                updated_at: nowIso(),
            },
            { onConflict: 'telegram_user_id' }
        );

        if (error) throw new Error(error.message);
    }

    static async clearSession(telegramUserId: string) {
        const { error } = await supabase
            .from('telegram_session_state')
            .delete()
            .eq('telegram_user_id', telegramUserId);

        if (error) throw new Error(error.message);
    }

    static async completeIdentityOnboarding(telegramUserId: string, draft: OnboardingDraft) {
        const telegramUser = await this.getTelegramUser(telegramUserId);
        if (!telegramUser) {
            throw new Error('Telegram user not found');
        }

        const role = draft.role;
        const fullName = cleanText(draft.full_name);
        const city = cleanText(draft.city);
        const mainSkillCategory = cleanNullable(draft.main_skill_category);

        if (!role || !fullName || !city) {
            throw new Error('Identity flow is incomplete');
        }

        const timestamp = nowIso();
        const existingProfile = await getProfile(telegramUser.profile_id);
        const nextRole = existingRole(existingProfile, role);
        const profileId = cleanText(existingProfile?.id) || crypto.randomUUID();
        const serraleId = cleanText(existingProfile?.serrale_id) || (await reserveSerraleId());
        const classification = normalizeProviderClassification(mainSkillCategory, mainSkillCategory);
        const completedSections = buildCompletedSections(nextRole);
        const profileCompletion = buildProfileCompletion(nextRole);
        const skills = Array.from(
            new Set([
                ...asStringArray(existingProfile?.skills),
                ...(mainSkillCategory ? [mainSkillCategory] : []),
            ])
        );

        const baseProfilePayload: LooseRecord = {
            id: profileId,
            user_id: cleanText(existingProfile?.user_id) || profileId,
            serrale_id: serraleId,
            role: cleanText(existingProfile?.role) || nextRole,
            name: fullName,
            full_name: fullName,
            city,
            country: cleanText(existingProfile?.country) || 'Ethiopia',
            location_city: city,
            location_country: cleanText(existingProfile?.location_country) || cleanText(existingProfile?.country) || 'Ethiopia',
            location: {
                city,
                country: cleanText(existingProfile?.location_country) || cleanText(existingProfile?.country) || 'Ethiopia',
            },
            registration_source: cleanText(existingProfile?.registration_source) || 'telegram_bot',
            main_skill_category: mainSkillCategory,
            current_step: nextRole === 'client' ? 'business' : 'public-readiness',
            completed_sections: completedSections,
            profile_completion: profileCompletion,
            completion_percentage: Math.max(DEFAULT_PROFILE_COMPLETION, asNumber(existingProfile?.completion_percentage)),
            completeness_score: Math.max(DEFAULT_PROFILE_COMPLETION, asNumber(existingProfile?.completeness_score)),
            completeness_state: 'INCOMPLETE',
            searchable: false,
            verified_identity: existingProfile?.verified_identity === true,
            updated_at: timestamp,
        };

        if (!existingProfile) {
            baseProfilePayload.created_at = timestamp;
        }

        if (nextRole === 'client') {
            baseProfilePayload.status = cleanText(existingProfile?.status) || 'draft';
            baseProfilePayload.title = cleanText(existingProfile?.title) || 'Hiring on Serrale';
            baseProfilePayload.business_type = cleanText(existingProfile?.business_type) || 'Individual';
            baseProfilePayload.category = cleanText(existingProfile?.category) || mainSkillCategory;
            baseProfilePayload.preferred_categories = Array.from(
                new Set([
                    ...asStringArray(existingProfile?.preferred_categories),
                    ...(mainSkillCategory ? [mainSkillCategory] : []),
                ])
            );
        } else {
            baseProfilePayload.status = cleanText(existingProfile?.status) || 'pending_verification';
            baseProfilePayload.user_level = cleanText(existingProfile?.user_level) || 'junior';
            baseProfilePayload.title =
                cleanText(existingProfile?.title) || `${mainSkillCategory || 'Serrale'} Professional`;
            baseProfilePayload.category = cleanText(existingProfile?.category) || classification.category || mainSkillCategory;
            baseProfilePayload.sub_category =
                cleanText(existingProfile?.sub_category) || classification.sub_category || mainSkillCategory;
            baseProfilePayload.industry = cleanText(existingProfile?.industry) || classification.category || mainSkillCategory;
            baseProfilePayload.skills = skills;
            baseProfilePayload.availability_status = cleanText(existingProfile?.availability_status) || 'Inactive';
        }

        const profile = await writeProfileWithSchemaFallback(baseProfilePayload);

        let intakeRecord: LooseRecord | null = null;
        if (nextRole === 'service_provider') {
            const currentIntake = await getIntakeById(telegramUser.current_intake_id);
            const intakePayload: LooseRecord = {
                registration_source: 'telegram_bot',
                intake_status: 'pending_verification',
                user_level: cleanText(profile.user_level) || 'junior',
                full_name: fullName,
                city,
                main_skill_category: mainSkillCategory,
                supporting_links_available: false,
                raw_payload: {
                    full_name: fullName,
                    city,
                    role: nextRole,
                    main_skill_category: mainSkillCategory,
                    serrale_id: cleanText(profile.serrale_id),
                },
                normalized_payload: {
                    full_name: fullName,
                    city,
                    role: nextRole,
                    main_skill_category: mainSkillCategory,
                    serrale_id: cleanText(profile.serrale_id),
                },
                source_submission_id: cleanText(profile.serrale_id) || serraleId,
                source_event_at: timestamp,
                profile_id: profile.id,
                updated_at: timestamp,
            };

            if (currentIntake) {
                const { data, error } = await supabase
                    .from('registration_intakes')
                    .update(intakePayload)
                    .eq('id', currentIntake.id)
                    .select('*')
                    .single();

                if (error) throw new Error(error.message);
                intakeRecord = data as LooseRecord;
            } else {
                const { data, error } = await supabase
                    .from('registration_intakes')
                    .insert({
                        ...intakePayload,
                        created_at: timestamp,
                    })
                    .select('*')
                    .single();

                if (error) throw new Error(error.message);
                intakeRecord = data as LooseRecord;
            }
        }

        const { error: userError } = await supabase
            .from('telegram_users')
            .update({
                profile_id: profile.id,
                current_intake_id: intakeRecord?.id || null,
                linked_at: telegramUser.linked_at || timestamp,
                updated_at: timestamp,
            })
            .eq('telegram_user_id', telegramUserId);

        if (userError) throw new Error(userError.message);

        const status = await this.getLinkStatus(telegramUserId);
        return {
            profile,
            intake: intakeRecord,
            status,
        };
    }

    static async consumeLinkToken(rawToken: string, telegramUserId: string) {
        const telegramUser = await this.getTelegramUser(telegramUserId);
        if (!telegramUser) {
            throw new Error('Telegram user not found');
        }

        const { data: linkToken, error } = await supabase
            .from('telegram_link_tokens')
            .select('id, profile_id, expires_at, consumed_at')
            .eq('token_hash', tokenHash(rawToken))
            .is('consumed_at', null)
            .maybeSingle();

        if (error) throw new Error(error.message);
        if (!linkToken) throw new Error('Link token not found or already used');
        if (new Date(String(linkToken.expires_at)).getTime() <= Date.now()) {
            throw new Error('Link token expired');
        }

        const targetProfile = await getProfile(String(linkToken.profile_id));
        if (!targetProfile) {
            throw new Error('Target Serrale profile not found');
        }

        const timestamp = nowIso();
        const currentProfileId = cleanText(telegramUser.profile_id);
        if (currentProfileId && currentProfileId !== String(linkToken.profile_id)) {
            const currentProfile = await getProfile(currentProfileId);
            const isLightweightTelegramProfile = cleanText(currentProfile?.registration_source) === 'telegram_bot';

            if (!isLightweightTelegramProfile) {
                throw new Error('This Telegram account is already linked to another Serrale profile');
            }

            const { data: savedJobs, error: savedJobsError } = await supabase
                .from('saved_jobs')
                .select('job_id')
                .eq('profile_id', currentProfileId);

            if (savedJobsError) throw new Error(savedJobsError.message);

            for (const row of savedJobs || []) {
                const { error: upsertSavedJobError } = await supabase
                    .from('saved_jobs')
                    .upsert(
                        {
                            profile_id: linkToken.profile_id,
                            job_id: row.job_id,
                        },
                        { onConflict: 'profile_id,job_id' }
                    );

                if (upsertSavedJobError) throw new Error(upsertSavedJobError.message);
            }

            const { error: clearSavedJobsError } = await supabase
                .from('saved_jobs')
                .delete()
                .eq('profile_id', currentProfileId);

            if (clearSavedJobsError) throw new Error(clearSavedJobsError.message);

            const { error: intakeRelinkError } = await supabase
                .from('registration_intakes')
                .update({
                    profile_id: linkToken.profile_id,
                    updated_at: timestamp,
                })
                .eq('profile_id', currentProfileId);

            if (intakeRelinkError) throw new Error(intakeRelinkError.message);
        }

        const { error: clearError } = await supabase
            .from('telegram_users')
            .update({
                profile_id: null,
                linked_at: null,
                updated_at: timestamp,
            })
            .eq('profile_id', linkToken.profile_id)
            .neq('telegram_user_id', telegramUserId);

        if (clearError) throw new Error(clearError.message);

        const { error: linkError } = await supabase
            .from('telegram_users')
            .update({
                profile_id: linkToken.profile_id,
                linked_at: timestamp,
                updated_at: timestamp,
            })
            .eq('telegram_user_id', telegramUserId);

        if (linkError) throw new Error(linkError.message);

        const { error: consumeError } = await supabase
            .from('telegram_link_tokens')
            .update({
                consumed_at: timestamp,
                updated_at: timestamp,
            })
            .eq('id', linkToken.id);

        if (consumeError) throw new Error(consumeError.message);

        return targetProfile;
    }

    static async attachContextUser(ctx: SerraleBotContext) {
        const chatId = ctx.chat && 'id' in ctx.chat ? ctx.chat.id : null;
        ctx.state.telegramUser = await this.upsertTelegramUser(ctx.from, chatId);
        return ctx.state.telegramUser;
    }
}
