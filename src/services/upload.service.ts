import path from 'path';
import type { Express } from 'express';
import { config } from '../config';
import type { UploadedTelegramDocument } from '../types';
import { supabase } from './supabase';

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

export function validateUpload(file: Express.Multer.File | undefined) {
    if (!file) {
        throw new Error('A CV file is required');
    }

    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new Error('Only PDF, DOC, and DOCX CV uploads are supported');
    }

    if (file.size > config.telegramMaxUploadBytes) {
        throw new Error(`CV files must be ${Math.floor(config.telegramMaxUploadBytes / (1024 * 1024))} MB or smaller`);
    }
}

export class UploadService {
    static async uploadCv(telegramUserId: string, file: Express.Multer.File): Promise<UploadedTelegramDocument> {
        validateUpload(file);

        const sanitizedName = sanitizeFileName(file.originalname || 'cv.pdf');
        const storagePath = `telegram-applications/${telegramUserId}/${Date.now()}-${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
            .from(config.telegramUploadBucket)
            .upload(storagePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (uploadError) {
            throw new Error(uploadError.message);
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from(config.telegramUploadBucket).getPublicUrl(storagePath);

        return {
            publicUrl,
            fileName: storagePath,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        };
    }
}
