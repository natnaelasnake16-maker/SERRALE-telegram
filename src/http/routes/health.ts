import { Router } from 'express';
import { config } from '../../config';
import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';

export function createHealthRouter() {
    const router = Router();

    router.get('/health', async (_req, res) => {
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

    return router;
}
