/**
 * Bluesky allows only ~10 createSession (login) calls per 24h per account. With docker's
 * `restart: unless-stopped`, a bad ASE_HANDLE / ASE_APP_PASSWORD makes the process exit and
 * restart every few seconds — burning that whole budget in about a minute and then locking the
 * account out of logging in at all. So when startup fails because login was *rejected*, the
 * process should wait before exiting (so the restart loop is slow) instead of failing fast.
 */

/** Wait between login attempts after a rejected login: 3h => at most 8 attempts/day, under the 10/day limit. */
export const AUTH_FAILURE_COOLDOWN_MS = 3 * 60 * 60 * 1000;
const MAX_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_RESET_SLACK_MS = 5_000;

interface XrpcErrorLike {
  status?: unknown;
  error?: unknown;
  headers?: Record<string, unknown> | undefined;
}

/**
 * Returns how long (ms) to wait before exiting after a failed startup login, or null when the
 * error isn't an auth rejection (network blips, crashes, etc. should still fail fast and restart).
 * - 429: wait until the server's own RateLimit-Reset time (epoch seconds), capped at 24h.
 * - 401 / AuthenticationRequired: wait AUTH_FAILURE_COOLDOWN_MS.
 */
export function authFailureCooldownMs(err: unknown, nowMs: number = Date.now()): number | null {
  if (typeof err !== "object" || err === null) return null;
  const { status, error, headers } = err as XrpcErrorLike;

  if (status === 429) {
    const reset = Number(headers?.["ratelimit-reset"]);
    if (Number.isFinite(reset) && reset > 0) {
      const wait = reset * 1000 - nowMs + RATE_LIMIT_RESET_SLACK_MS;
      return Math.min(Math.max(wait, AUTH_FAILURE_COOLDOWN_MS), MAX_COOLDOWN_MS);
    }
    return AUTH_FAILURE_COOLDOWN_MS;
  }

  if (status === 401 || error === "AuthenticationRequired") return AUTH_FAILURE_COOLDOWN_MS;
  return null;
}
