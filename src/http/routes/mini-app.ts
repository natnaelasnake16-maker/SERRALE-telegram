import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../../config';
import { ApplicationService } from '../../services/application.service';
import { JobService } from '../../services/job.service';
import { UploadService } from '../../services/upload.service';
import { UserService } from '../../services/user.service';
import { requireTelegramInit, TelegramMiniAppRequest } from '../middleware/telegram-init';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.telegramMaxUploadBytes,
    },
});

const applyPayloadSchema = z.object({
    full_name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(5).max(40),
    email: z.string().trim().email().optional().or(z.literal('')),
    cv_file_url: z.string().trim().url().optional().or(z.literal('')),
    cv_file_name: z.string().trim().min(1).max(255).optional().or(z.literal('')),
    note: z.string().trim().max(1200).optional().or(z.literal('')),
    consent: z.boolean(),
});

function miniAppIndexPath() {
    return path.resolve(process.cwd(), 'src/mini-app/index.html');
}

function resolveJobId(req: TelegramMiniAppRequest) {
    return String(req.query.jobId || req.query.job_id || '').trim();
}

export function createMiniAppRouter() {
    const router = Router();

    router.get('/mini-app', (_req, res) => {
        res.sendFile(miniAppIndexPath());
    });

    router.get('/mini-app/bootstrap', requireTelegramInit, async (req: TelegramMiniAppRequest, res) => {
        try {
            const telegramUserId = String(req.telegramInitUser?.id || '');
            const jobId = resolveJobId(req);
            const status = await UserService.getLinkStatus(telegramUserId);
            const applications = await ApplicationService.getStatsForTelegramUser(telegramUserId);
            const job = jobId ? await JobService.getJobById(jobId, status.profile_id) : null;
            const alreadyApplied = jobId ? await ApplicationService.hasAppliedToJob(jobId, telegramUserId) : false;

            return res.json({
                status,
                job,
                can_save: Boolean(status.profile_id),
                can_apply: Boolean(job && job.status === 'open' && !alreadyApplied),
                mini_app_url: `${config.telegramAppUrl}/mini-app`,
                web_job_url: job ? `${config.serraleWebUrl}/job/${job.id}` : null,
                applications,
            });
        } catch (error: any) {
            return res.status(500).json({
                error: 'MINI_APP_BOOTSTRAP_FAILED',
                message: error?.message || 'Failed to bootstrap the Mini App',
            });
        }
    });

    router.get('/mini-app/jobs/:id', requireTelegramInit, async (req: TelegramMiniAppRequest, res) => {
        try {
            const telegramUserId = String(req.telegramInitUser?.id || '');
            const status = await UserService.getLinkStatus(telegramUserId);
            const job = await JobService.getJobById(String(req.params.id), status.profile_id);

            if (!job) {
                return res.status(404).json({
                    error: 'JOB_NOT_FOUND',
                    message: 'Job not found',
                });
            }

            return res.json({
                job,
                can_save: Boolean(status.profile_id),
                can_apply: job.status === 'open' && !(await ApplicationService.hasAppliedToJob(job.id, telegramUserId)),
            });
        } catch (error: any) {
            return res.status(500).json({
                error: 'MINI_APP_JOB_FETCH_FAILED',
                message: error?.message || 'Failed to load the job',
            });
        }
    });

    router.post('/mini-app/jobs/:id/save', requireTelegramInit, async (req: TelegramMiniAppRequest, res) => {
        try {
            const telegramUserId = String(req.telegramInitUser?.id || '');
            const status = await UserService.getLinkStatus(telegramUserId);
            if (!status.profile_id) {
                return res.status(403).json({
                    error: 'LINK_REQUIRED',
                    message: 'Link your Serrale account before saving jobs',
                });
            }

            const parsed = z.object({ save: z.boolean() }).parse(req.body);
            await JobService.toggleSavedJob(status.profile_id, String(req.params.id), parsed.save);

            return res.json({ success: true });
        } catch (error: any) {
            return res.status(400).json({
                error: 'JOB_SAVE_FAILED',
                message: error?.message || 'Could not update the saved job state',
            });
        }
    });

    router.post('/mini-app/jobs/:id/apply', requireTelegramInit, async (req: TelegramMiniAppRequest, res) => {
        try {
            const telegramUserId = String(req.telegramInitUser?.id || '');
            const parsed = applyPayloadSchema.parse(req.body);

            if (!parsed.consent) {
                return res.status(400).json({
                    error: 'CONSENT_REQUIRED',
                    message: 'Consent is required before submitting',
                });
            }

            const application = await ApplicationService.create(String(req.params.id), telegramUserId, {
                full_name: parsed.full_name,
                phone: parsed.phone,
                email: parsed.email || null,
                cv_file_url: parsed.cv_file_url || null,
                cv_file_name: parsed.cv_file_name || null,
                note: parsed.note || null,
                consent: parsed.consent,
            });

            return res.json({ application });
        } catch (error: any) {
            return res.status(400).json({
                error: 'JOB_APPLY_FAILED',
                message: error?.message || 'Could not submit the Telegram application',
            });
        }
    });

    router.post('/mini-app/upload-cv', requireTelegramInit, upload.single('file'), async (req: TelegramMiniAppRequest, res) => {
        try {
            const telegramUserId = String(req.telegramInitUser?.id || '');
            const file = await UploadService.uploadCv(telegramUserId, req.file as Express.Multer.File);
            return res.json({ file });
        } catch (error: any) {
            return res.status(400).json({
                error: 'CV_UPLOAD_FAILED',
                message: error?.message || 'Could not upload the CV',
            });
        }
    });

    router.get('/mini-app/me/status', requireTelegramInit, async (req: TelegramMiniAppRequest, res) => {
        try {
            const telegramUserId = String(req.telegramInitUser?.id || '');
            const status = await UserService.getLinkStatus(telegramUserId);
            const applications = await ApplicationService.listForTelegramUser(telegramUserId);

            return res.json({
                status,
                applications,
            });
        } catch (error: any) {
            return res.status(500).json({
                error: 'MINI_APP_STATUS_FAILED',
                message: error?.message || 'Could not load status',
            });
        }
    });

    router.get('/mini-app/me/applications', requireTelegramInit, async (req: TelegramMiniAppRequest, res) => {
        try {
            const telegramUserId = String(req.telegramInitUser?.id || '');
            const applications = await ApplicationService.listForTelegramUser(telegramUserId);
            return res.json({ applications });
        } catch (error: any) {
            return res.status(500).json({
                error: 'MINI_APP_APPLICATIONS_FAILED',
                message: error?.message || 'Could not load Telegram applications',
            });
        }
    });

    return router;
}
