import express from 'express';
import { config } from './config';
import { createBot } from './bot';
import { supabase } from './services/supabase';
import { logger } from './utils/logger';

async function bootstrap() {
    const bot = createBot();
    const app = express();

    app.use(express.json({ limit: '2mb' }));

    app.get('/health', async (_req, res) => {
        try {
            const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
            if (error) {
                throw error;
            }

            return res.json({
                status: 'ok',
                mode: config.isWebhookMode ? 'webhook' : 'polling',
                timestamp: new Date().toISOString(),
            });
        } catch (error: any) {
            logger.error('Telegram health check failed', { error });
            return res.status(503).json({
                status: 'degraded',
                message: error?.message || 'Database check failed',
            });
        }
    });

    app.post(`/telegram/webhook/${config.telegramWebhookSecret}`, async (req, res) => {
        try {
            await bot.handleUpdate(req.body);
            return res.sendStatus(200);
        } catch (error) {
            logger.error('Telegram webhook processing failed', { error });
            return res.sendStatus(500);
        }
    });

    const server = app.listen(config.port, async () => {
        logger.info('Serrale Telegram service listening', {
            port: config.port,
            mode: config.isWebhookMode ? 'webhook' : 'polling',
        });

        if (config.isWebhookMode) {
            await bot.telegram.setWebhook(config.telegramWebhookUrl);
            logger.info('Telegram webhook configured', { url: config.telegramWebhookUrl });
        } else {
            await bot.telegram.deleteWebhook({ drop_pending_updates: false });
            await bot.launch();
            logger.info('Telegram bot launched in polling mode');
        }
    });

    const shutdown = async (signal: string) => {
        logger.info('Shutting down Telegram service', { signal });
        bot.stop(signal);
        server.close();
    };

    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
    logger.error('Failed to bootstrap Serrale Telegram service', { error });
    process.exit(1);
});
