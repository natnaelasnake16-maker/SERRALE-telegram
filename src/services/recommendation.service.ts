import type { JobSummary, TelegramLinkStatus } from '../types';
import { JobService } from './job.service';

function scoreJob(job: JobSummary, status: TelegramLinkStatus) {
    let score = 0;

    if (status.main_skill_category && job.category === status.main_skill_category) {
        score += 30;
    }

    if (status.city && job.city === status.city) {
        score += 20;
    }

    if ((job.location_type || '').toLowerCase() === 'remote') {
        score += 10;
    }

    const createdAt = job.created_at ? new Date(job.created_at).getTime() : 0;
    if (createdAt) {
        const ageInDays = Math.max(0, (Date.now() - createdAt) / (1000 * 60 * 60 * 24));
        score += Math.max(0, 15 - ageInDays);
    }

    return score;
}

export class RecommendationService {
    static async listRecommendedJobs(status: TelegramLinkStatus) {
        const result = await JobService.listOpenJobs({
            page: 1,
            pageSize: 10,
            profileId: status.profile_id,
        });

        return result.jobs
            .map((job) => ({ ...job, _score: scoreJob(job, status) }))
            .sort((left, right) => right._score - left._score)
            .slice(0, 5)
            .map(({ _score, ...job }) => job);
    }
}
