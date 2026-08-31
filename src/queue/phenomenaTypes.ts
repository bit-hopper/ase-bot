/** No per-job data — the worker computes "now" and fresh positions itself on every tick. */
export type PhenomenaCheckJob = Record<string, never>;
