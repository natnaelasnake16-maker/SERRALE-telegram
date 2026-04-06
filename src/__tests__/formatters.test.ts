process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.TELEGRAM_BOT_USERNAME = 'serrale_test_bot';
process.env.TELEGRAM_WEBHOOK_SECRET = 'secret';
process.env.TELEGRAM_WEBHOOK_URL = 'https://example.com/webhook';
process.env.TELEGRAM_CHANNEL_USERNAME = '@SerraleJobs';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
process.env.SERRALE_WEB_URL = 'https://serrale.com';

const { formatIdentityCompleted, formatJobDetail } = require('../utils/formatters');

describe('formatters', () => {
    it('includes the web apply URL in job details', () => {
        const result = formatJobDetail(
            {
                id: 'job-1',
                title: 'UI Designer',
                category: 'Design',
                city: 'Addis Ababa',
                budget: 15000,
                budget_min: null,
                budget_max: null,
                job_type: 'fixed',
                duration: '2 weeks',
                description: 'Design a complete marketing landing page.',
            },
            { linked: true, saved: false }
        );

        expect(result).toContain('https://serrale.com/job/job-1');
        expect(result).toContain('Saved: No');
    });

    it('formats the issued Serrale identity summary', () => {
        const result = formatIdentityCompleted({
            linked: true,
            role: 'service_provider',
            profile_id: 'profile-1',
            serrale_id: 'SER-00847',
            intake_status: 'pending_verification',
            saved_jobs_count: 0,
            intake_id: 'intake-1',
            full_name: 'Abel Bekele',
            phone: '+251911000000',
            email: 'abel@example.com',
            city: 'Addis Ababa',
            main_skill_category: 'Graphic Design',
            user_level: 'junior',
            profile_completion: 40,
            trust_level: 'level_1',
            application_count: 0,
            last_application_at: null,
            state: 'linked_provider',
            is_admin: false,
        });

        expect(result).toContain('SER-00847');
        expect(result).toContain('Junior Service Provider');
        expect(result).toContain('Graphic Design');
        expect(result).toContain('40% complete');
    });
});
