import { config } from './config';
import { createBot } from './bot';
import { createServer } from './http/server';
import { logger } from './utils/logger';

async function bootstrap() {
    const bot = createBot();
    const app = createServer(bot);

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
