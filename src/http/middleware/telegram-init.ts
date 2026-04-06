import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../../config';
import { UserService } from '../../services/user.service';

interface TelegramInitUser {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_bot?: boolean;
}

export interface TelegramMiniAppRequest extends Request {
    telegramInitData?: string;
    telegramInitUser?: TelegramInitUser;
}

function parseInitData(initData: string) {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash') || '';
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secret = crypto.createHmac('sha256', 'WebAppData').update(config.telegramBotToken).digest();
    const computedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    if (computedHash !== hash) {
        throw new Error('Invalid Telegram init data');
    }

    const rawUser = params.get('user');
    if (!rawUser) {
        throw new Error('Missing Telegram user data');
    }

    return {
        params,
        user: JSON.parse(rawUser) as TelegramInitUser,
    };
}

async function resolveDevUser(req: TelegramMiniAppRequest) {
    if (config.isProduction) {
        throw new Error('Missing Telegram init data');
    }

    const telegramUserId = String(req.query.telegramUserId || req.header('x-telegram-user-id') || '');
    if (!telegramUserId) {
        throw new Error('Missing Telegram init data');
    }

    const mockUser: TelegramInitUser = {
        id: Number(telegramUserId),
        username: String(req.query.username || req.header('x-telegram-username') || '') || undefined,
        first_name: String(req.query.firstName || req.header('x-telegram-first-name') || 'Local'),
        last_name: String(req.query.lastName || req.header('x-telegram-last-name') || 'Tester'),
        language_code: 'en',
        is_bot: false,
    };

    await UserService.upsertTelegramUser(mockUser as any, telegramUserId);
    return mockUser;
}

export async function requireTelegramInit(req: TelegramMiniAppRequest, res: Response, next: NextFunction) {
    try {
        const initData = req.header('x-telegram-init-data') || req.query.initData?.toString() || '';

        if (!initData) {
            req.telegramInitUser = await resolveDevUser(req);
            return next();
        }

        const parsed = parseInitData(initData);
        req.telegramInitData = initData;
        req.telegramInitUser = parsed.user;
        await UserService.upsertTelegramUser(parsed.user as any, parsed.user.id);
        return next();
    } catch (error: any) {
        return res.status(401).json({
            error: 'TELEGRAM_INIT_INVALID',
            message: error?.message || 'Telegram launch data is required',
        });
    }
}
