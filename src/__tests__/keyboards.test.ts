process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.TELEGRAM_BOT_USERNAME = 'serrale_test_bot';
process.env.TELEGRAM_WEBHOOK_SECRET = 'secret';
process.env.TELEGRAM_WEBHOOK_URL = 'https://example.com/webhook';
process.env.TELEGRAM_CHANNEL_USERNAME = '@SerraleJobs';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
process.env.SERRALE_WEB_URL = 'https://serrale.com';

const { channelPostKeyboard, mainMenuKeyboard, onboardingCityKeyboard } = require('../utils/keyboards');

describe('keyboards', () => {
    it('shows admin queue button for admins', () => {
        const keyboard = mainMenuKeyboard({ linked: true, isAdmin: true });
        const labels = keyboard.reply_markup.inline_keyboard.flat().map((button: any) => button.text);
        expect(labels).toContain('Admin Queue');
        expect(labels).toContain('Browse Jobs');
    });

    it('shows the lightweight identity choices', () => {
        const keyboard = onboardingCityKeyboard();
        const labels = keyboard.reply_markup.inline_keyboard.flat().map((button: any) => button.text);
        expect(labels).toContain('Addis Ababa');
        expect(labels).toContain('Other');
    });

    it('uses the private bot apply deep link in the channel keyboard', () => {
        const keyboard = channelPostKeyboard('job-1');
        const firstRow = keyboard.reply_markup.inline_keyboard[0];
        expect(firstRow[0].text).toBe('Apply in Bot');
        expect(firstRow[0].url).toContain('https://t.me/serrale_test_bot?start=apply_job-1');
    });
});
