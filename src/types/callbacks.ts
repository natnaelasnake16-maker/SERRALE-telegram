export const JOB_FILTER_KEYS = ['all', 'recent', 'remote', 'nearby', 'my_category', 'saved'] as const;

export type JobFilterKey = (typeof JOB_FILTER_KEYS)[number];

export function isJobFilterKey(value: string): value is JobFilterKey {
    return (JOB_FILTER_KEYS as readonly string[]).includes(value);
}
