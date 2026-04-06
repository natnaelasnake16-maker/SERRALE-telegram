export const TELEGRAM_APPLICATION_STATUSES = ['submitted', 'reviewed', 'promoted'] as const;

export type TelegramApplicationStatus = (typeof TELEGRAM_APPLICATION_STATUSES)[number];

export interface TelegramJobApplicationRecord {
    id: string;
    job_id: string;
    telegram_user_id: string;
    profile_id: string | null;
    full_name: string;
    phone: string;
    email: string | null;
    cv_file_url: string | null;
    cv_file_name: string | null;
    note: string | null;
    status: TelegramApplicationStatus;
    source: 'telegram_bot';
    submitted_at: string;
    promoted_to_proposal_id: string | null;
    raw_payload: Record<string, unknown> | null;
}

export interface TelegramApplicationCreateInput {
    full_name: string;
    phone: string;
    email?: string | null;
    cv_file_url?: string | null;
    cv_file_name?: string | null;
    note?: string | null;
    consent: boolean;
}

export interface TelegramApplicationStats {
    count: number;
    last_submitted_at: string | null;
}

export interface UploadedTelegramDocument {
    publicUrl: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
}
