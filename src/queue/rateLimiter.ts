import type { Redis } from "ioredis";
import type { CommandName } from "../commands/parser.js";

export type RateLimitCategory = "reading" | "pull" | "unlimited";

/**
 * §14's table only classifies /reading, /pull, and the explicitly-unlimited
 * /help|/chart|/sign|/moon — /set is never mentioned in either bucket. Resolved toward
 * "unlimited": it's a lightweight DB write with the same profile as the other
 * already-unlimited commands, not a readings/pulls resource consumer. Still subject to
 * the universal 30s min-gap rule below, since that applies to "any two interactions."
 *
 * `/divine` (the renamed original /reading engine) shares
 * the "reading" bucket with /reading: it does the same live-ephemeris Impact Score
 * computation the bucket was sized for, so it needs the same limit, not the "unlimited"
 * default a genuinely new, unclassified command would fall through to.
 */
export function rateLimitCategoryFor(command: CommandName | null): RateLimitCategory {
  if (command === "reading" || command === "divine") return "reading";
  if (command === "pull") return "pull";
  return "unlimited";
}

export interface RateLimitResult {
  allowed: boolean;
  /** Present when allowed=false — §14: "reply with a short message noting when the user can request again." */
  reply?: string;
}

const MIN_GAP_MS = 30_000;
const READING_HOURLY_LIMIT = 5;
const READING_DAILY_LIMIT = 20;
const PULL_HOURLY_LIMIT = 10;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function lastKey(did: string): string {
  return `ratelimit:last:${did}`;
}
function readingsKey(did: string): string {
  return `ratelimit:readings:${did}`;
}
function pullsKey(did: string): string {
  return `ratelimit:pulls:${did}`;
}

/** Non-destructive count of sorted-set members scored within the last `windowMs`. */
async function countInWindow(redis: Redis, key: string, nowMs: number, windowMs: number): Promise<number> {
  return redis.zcount(key, nowMs - windowMs, nowMs);
}

/** Records one event and prunes anything older than `retentionMs` (the largest window that key is ever queried with). */
async function recordEvent(redis: Redis, key: string, nowMs: number, retentionMs: number): Promise<void> {
  const member = `${nowMs}-${Math.random().toString(36).slice(2, 8)}`;
  await redis.zadd(key, nowMs, member);
  await redis.zremrangebyscore(key, 0, nowMs - retentionMs);
  await redis.expire(key, Math.ceil(retentionMs / 1000));
}

/** §14 — checked before a job enters the worker (called from the queue consumer). */
export async function checkRateLimit(redis: Redis, did: string, category: RateLimitCategory, now: Date = new Date()): Promise<RateLimitResult> {
  const nowMs = now.getTime();

  const lastRaw = await redis.get(lastKey(did));
  if (lastRaw) {
    const elapsedMs = nowMs - Number(lastRaw);
    if (elapsedMs < MIN_GAP_MS) {
      const waitSeconds = Math.ceil((MIN_GAP_MS - elapsedMs) / 1000);
      return { allowed: false, reply: `Hey! Slow down a little — try again in ${waitSeconds}s.` };
    }
  }

  if (category === "reading") {
    const hourly = await countInWindow(redis, readingsKey(did), nowMs, HOUR_MS);
    if (hourly >= READING_HOURLY_LIMIT) {
      return { allowed: false, reply: `You've hit your hourly reading limit (${READING_HOURLY_LIMIT}/hr) — take a walk, get some fresh air, hydrate. Come back later.` };
    }
    const daily = await countInWindow(redis, readingsKey(did), nowMs, DAY_MS);
    if (daily >= READING_DAILY_LIMIT) {
      return { allowed: false, reply: `You've hit your daily reading limit (${READING_DAILY_LIMIT}/day) — try again tomorrow.` };
    }
  } else if (category === "pull") {
    const hourly = await countInWindow(redis, pullsKey(did), nowMs, HOUR_MS);
    if (hourly >= PULL_HOURLY_LIMIT) {
      return { allowed: false, reply: `You've hit your hourly pull limit (${PULL_HOURLY_LIMIT}/hr) — try again in a bit.` };
    }
  }

  return { allowed: true };
}

/** Call only after a request has been allowed and actually processed. */
export async function recordInteraction(redis: Redis, did: string, category: RateLimitCategory, now: Date = new Date()): Promise<void> {
  const nowMs = now.getTime();
  // Only needs to outlive the 30s gap check, but a little slack is harmless.
  await redis.set(lastKey(did), String(nowMs), "EX", 60);

  if (category === "reading") {
    await recordEvent(redis, readingsKey(did), nowMs, DAY_MS); // one set backs both the hourly and daily checks
  } else if (category === "pull") {
    await recordEvent(redis, pullsKey(did), nowMs, HOUR_MS);
  }
}
