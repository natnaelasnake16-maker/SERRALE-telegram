import { Router } from 'express';
import type { Telegraf } from 'telegraf';
import { config } from '../../config';
import type { SerraleBotContext } from '../../types';
import { logger } from '../../utils/logger';

export function createWebhookRouter(bot: Telegraf<SerraleBotContext>) {
    const router = Router();

    router.post(`/telegram/webhook/${config.telegramWebhookSecret}`, async (req, res) => {
        try {
            await bot.handleUpdate(req.body);
            return res.sendStatus(200);
        } catch (error) {
            logger.error('Telegram webhook processing failed', { error });
            return res.sendStatus(500);
        }
    });

    return router;
}
