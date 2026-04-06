import express from 'express';
import path from 'path';
import type { Telegraf } from 'telegraf';
import type { SerraleBotContext } from '../types';
import { createHealthRouter } from './routes/health';
import { createMiniAppRouter } from './routes/mini-app';
import { createWebhookRouter } from './routes/webhook';

export function createServer(bot: Telegraf<SerraleBotContext>) {
    const app = express();

    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true }));

    app.use(createHealthRouter());
    app.use(createWebhookRouter(bot));
    app.use(createMiniAppRouter());
    app.use('/mini-app', express.static(path.resolve(process.cwd(), 'src/mini-app')));

    return app;
}
