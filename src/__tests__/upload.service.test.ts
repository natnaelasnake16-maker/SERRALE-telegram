process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.TELEGRAM_BOT_USERNAME = 'serrale_test_bot';
process.env.TELEGRAM_WEBHOOK_SECRET = 'secret';
process.env.TELEGRAM_WEBHOOK_URL = 'https://example.com/telegram/webhook/secret';
process.env.TELEGRAM_CHANNEL_USERNAME = '@SerraleJobs';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
process.env.SERRALE_WEB_URL = 'https://serrale.com';

const { validateUpload } = require('../services/upload.service');

describe('upload validation', () => {
    it('accepts a pdf upload', () => {
        expect(() =>
            validateUpload({
                originalname: 'candidate-cv.pdf',
                mimetype: 'application/pdf',
                size: 1024 * 100,
            })
        ).not.toThrow();
    });

    it('rejects unsupported file types', () => {
        expect(() =>
            validateUpload({
                originalname: 'candidate-cv.png',
                mimetype: 'image/png',
                size: 1024 * 100,
            })
        ).toThrow('Only PDF, DOC, and DOCX CV uploads are supported');
    });
});
