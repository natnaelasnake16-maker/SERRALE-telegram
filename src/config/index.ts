import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_BOT_USERNAME: z.string().min(1),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(1).default('serrale-telegram-webhook'),
    TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
    TELEGRAM_CHANNEL_USERNAME: z.string().min(1).default('@SerraleJobs'),
    TELEGRAM_ADMIN_IDS: z.string().optional().default(''),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SERRALE_WEB_URL: z.string().url().default('https://serrale.com'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3400),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
});

const parsed = envSchema.parse(process.env);

const telegramBotUsername = parsed.TELEGRAM_BOT_USERNAME.replace(/^@/, '').trim();
const telegramChannelUsername = parsed.TELEGRAM_CHANNEL_USERNAME.startsWith('@')
    ? parsed.TELEGRAM_CHANNEL_USERNAME.trim()
    : `@${parsed.TELEGRAM_CHANNEL_USERNAME.trim()}`;
const telegramAdminIds = parsed.TELEGRAM_ADMIN_IDS
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

export const config = {
    telegramBotToken: parsed.TELEGRAM_BOT_TOKEN,
    telegramBotUsername,
    telegramWebhookSecret: parsed.TELEGRAM_WEBHOOK_SECRET,
    telegramWebhookUrl: parsed.TELEGRAM_WEBHOOK_URL || '',
    telegramChannelUsername,
    telegramAdminIds,
    supabaseUrl: parsed.SUPABASE_URL,
    supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
    serraleWebUrl: parsed.SERRALE_WEB_URL.replace(/\/$/, ''),
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    isProduction: parsed.NODE_ENV === 'production',
    isWebhookMode: parsed.NODE_ENV === 'production' && Boolean(parsed.TELEGRAM_WEBHOOK_URL),
};

export type AppConfig = typeof config;
