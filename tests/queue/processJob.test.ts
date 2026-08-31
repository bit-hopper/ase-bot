import { constants } from "sweph";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { createRedisClient } from "../../src/queue/redisClient.js";
import { processReadingJob, type ProcessJobDeps } from "../../src/queue/processJob.js";
import type { ReadingJob } from "../../src/queue/types.js";
import { recordInteraction } from "../../src/queue/rateLimiter.js";
import { getUserProfile, upsertUserProfile } from "../../src/profile/userProfileStore.js";
import type { ReplyThread } from "../../src/output/replyThread.js";

const pool = getPool();
const redis = createRedisClient();

beforeEach(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.query("TRUNCATE ephemeris_cache");
  await redis.flushdb();
});

afterAll(async () => {
  await pool.query("TRUNCATE user_profiles");
  await pool.query("TRUNCATE ephemeris_cache");
  await redis.flushdb();
  await redis.quit();
  await pool.end();
});

function makeJob(overrides: Partial<ReadingJob> = {}): ReadingJob {
  return {
    mentionUri: "at://did:plc:author/app.bsky.feed.post/abc",
    mentionCid: "cid123",
    authorDid: "did:plc:test-process-job",
    authorHandle: "user.bsky.social",
    command: "/help",
    enqueuedAt: new Date("2026-08-28T12:00:00Z").toISOString(),
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ProcessJobDeps> = {}): ProcessJobDeps {
  const posted: Array<{ job: ReadingJob; reply: ReplyThread }> = [];
  return {
    ctxBase: { pool, ephemerisTtlHours: 2, calcFlags: constants.SEFLG_MOSEPH | constants.SEFLG_SPEED, templates: [] },
    redis,
    pool,
    postReply: async (job, reply) => {
      posted.push({ job, reply });
    },
    now: () => new Date("2026-08-28T12:00:00Z"),
    ...overrides,
  };
}

describe("processReadingJob (§12.3)", () => {
  it("discards a stale job without posting (§12.1)", async () => {
    let called = false;
    const deps = makeDeps({ postReply: async () => { called = true; } });
    const job = makeJob({ enqueuedAt: new Date("2026-08-28T11:59:00Z").toISOString() }); // 60s before "now"

    const result = await processReadingJob(deps, job);
    expect(result.outcome).toBe("stale");
    expect(called).toBe(false);
  });

  it("processes a fresh job and posts the reply", async () => {
    let posted: ReplyThread | null = null;
    const deps = makeDeps({ postReply: async (_job, reply) => { posted = reply; } });

    const result = await processReadingJob(deps, makeJob({ command: "/help" }));
    expect(result.outcome).toBe("posted");
    expect(posted!.join("\n")).toContain("Asé");
  });

  it("rate-limits a second interaction within 30s and still posts a reply (§14)", async () => {
    const did = "did:plc:test-process-job-ratelimit";
    await recordInteraction(redis, did, "unlimited", new Date("2026-08-28T11:59:40Z")); // 20s before "now"

    let posted: ReplyThread | null = null;
    const deps = makeDeps({ postReply: async (_job, reply) => { posted = reply; } });

    const result = await processReadingJob(deps, makeJob({ authorDid: did, command: "/help" }));
    expect(result.outcome).toBe("rate_limited");
    expect(posted!.join("\n")).toMatch(/try again in/);
  });

  it("updates last_reading_at after a successful /reading, not last_pull_at", async () => {
    const did = "did:plc:test-process-job-reading";
    await upsertUserProfile(pool, did, { sun: "leo", moon: "pisces", rising: "sagittarius", profileSource: "command" });

    const deps = makeDeps({ postReply: async () => {} });
    const result = await processReadingJob(deps, makeJob({ authorDid: did, command: "/reading" }));

    expect(result.outcome).toBe("posted");
    const row = await getUserProfile(pool, did);
    expect(row?.lastReadingAt).not.toBeNull();
    expect(row?.lastPullAt).toBeNull();
  });

  it("updates last_pull_at after a successful /pull, not last_reading_at", async () => {
    const did = "did:plc:test-process-job-pull";

    const deps = makeDeps({ postReply: async () => {} });
    const result = await processReadingJob(deps, makeJob({ authorDid: did, command: "/pull" }));

    expect(result.outcome).toBe("posted");
    const row = await getUserProfile(pool, did);
    expect(row?.lastPullAt).not.toBeNull();
    expect(row?.lastReadingAt).toBeNull();
  });

  it("does not touch last_reading_at/last_pull_at for unlimited commands", async () => {
    const did = "did:plc:test-process-job-unlimited";
    await upsertUserProfile(pool, did, { sun: "leo", profileSource: "command" });

    const deps = makeDeps({ postReply: async () => {} });
    await processReadingJob(deps, makeJob({ authorDid: did, command: "/sign" }));

    const row = await getUserProfile(pool, did);
    expect(row?.lastReadingAt).toBeNull();
    expect(row?.lastPullAt).toBeNull();
  });
});
