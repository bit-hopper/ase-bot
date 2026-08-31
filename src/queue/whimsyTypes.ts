/** No per-job data — the worker computes "now," fetches recent post history, and picks fresh
 *  fragments itself on every tick. */
export type WhimsyPostJob = Record<string, never>;
