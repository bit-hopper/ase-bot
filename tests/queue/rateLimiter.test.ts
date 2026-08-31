import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createRedisClient } from "../../src/queue/redisClient.js";
import { checkRateLimit, rateLimitCategoryFor, recordInteraction } from "../../src/queue/rateLimiter.js";

const redis = createRedisClient();
const DID = "did:plc:test-rate-limiter";

beforeEach(async () => {
  await redis.flushdb();
});

afterAll(async () => {
  await redis.flushdb();
  await redis.quit();
});

describe("rateLimitCategoryFor", () => {
  it("classifies reading and divine as 'reading'", () => {
    expect(rateLimitCategoryFor("reading")).toBe("reading");
    expect(rateLimitCategoryFor("divine")).toBe("reading");
  });

  it("classifies pull as 'pull'", () => {
    expect(rateLimitCategoryFor("pull")).toBe("pull");
  });

  it("classifies help/chart/sign/moon/set/null as 'unlimited'", () => {
    for (const cmd of ["help", "chart", "sign", "moon", "set", null] as const) {
      expect(rateLimitCategoryFor(cmd)).toBe("unlimited");
    }
  });
});

describe("checkRateLimit (§14)", () => {
  it("allows a first-ever request", async () => {
    const result = await checkRateLimit(redis, DID, "reading");
    expect(result.allowed).toBe(true);
  });

  it("blocks a second interaction within 30s of the first, for any category", async () => {
    const t0 = new Date("2026-08-28T12:00:00Z");
    await recordInteraction(redis, DID, "unlimited", t0);

    const t1 = new Date(t0.getTime() + 10_000); // 10s later
    const result = await checkRateLimit(redis, DID, "unlimited", t1);
    expect(result.allowed).toBe(false);
    expect(result.reply).toMatch(/try again in/);
  });

  it("allows again once 30s have passed", async () => {
    const t0 = new Date("2026-08-28T12:00:00Z");
    await recordInteraction(redis, DID, "unlimited", t0);

    const t1 = new Date(t0.getTime() + 30_000);
    const result = await checkRateLimit(redis, DID, "unlimited", t1);
    expect(result.allowed).toBe(true);
  });

  it("enforces the 5/hr reading limit", async () => {
    const base = new Date("2026-08-28T12:00:00Z");
    for (let i = 0; i < 5; i++) {
      const t = new Date(base.getTime() + i * 31_000); // 31s apart, clears the min-gap each time
      const result = await checkRateLimit(redis, DID, "reading", t);
      expect(result.allowed).toBe(true);
      await recordInteraction(redis, DID, "reading", t);
    }

    const sixth = new Date(base.getTime() + 5 * 31_000);
    const result = await checkRateLimit(redis, DID, "reading", sixth);
    expect(result.allowed).toBe(false);
    expect(result.reply).toMatch(/hourly reading limit/);
  });

  it("enforces the 20/day reading limit even when spread outside the hourly window", async () => {
    const base = new Date("2026-08-28T00:00:00Z");
    // 20 readings, one per hour, each hour's own count resets so only the daily limit trips.
    for (let i = 0; i < 20; i++) {
      const t = new Date(base.getTime() + i * 60 * 60 * 1000);
      const result = await checkRateLimit(redis, DID, "reading", t);
      expect(result.allowed).toBe(true);
      await recordInteraction(redis, DID, "reading", t);
    }

    const twentyFirst = new Date(base.getTime() + 20 * 60 * 60 * 1000);
    const result = await checkRateLimit(redis, DID, "reading", twentyFirst);
    expect(result.allowed).toBe(false);
    expect(result.reply).toMatch(/daily reading limit/);
  });

  it("enforces the 10/hr pull limit independently of readings", async () => {
    const base = new Date("2026-08-28T12:00:00Z");
    for (let i = 0; i < 10; i++) {
      const t = new Date(base.getTime() + i * 31_000);
      expect((await checkRateLimit(redis, DID, "pull", t)).allowed).toBe(true);
      await recordInteraction(redis, DID, "pull", t);
    }

    const eleventh = new Date(base.getTime() + 10 * 31_000);
    const result = await checkRateLimit(redis, DID, "pull", eleventh);
    expect(result.allowed).toBe(false);
    expect(result.reply).toMatch(/hourly pull limit/);
  });

  it("never rate-limits the 'unlimited' category beyond the 30s gap", async () => {
    const base = new Date("2026-08-28T12:00:00Z");
    for (let i = 0; i < 50; i++) {
      const t = new Date(base.getTime() + i * 31_000);
      const result = await checkRateLimit(redis, DID, "unlimited", t);
      expect(result.allowed).toBe(true);
      await recordInteraction(redis, DID, "unlimited", t);
    }
  });

  it("tracks rate limits per-user (a different DID is unaffected)", async () => {
    const base = new Date("2026-08-28T12:00:00Z");
    await recordInteraction(redis, DID, "unlimited", base);

    const other = await checkRateLimit(redis, "did:plc:someone-else", "unlimited", new Date(base.getTime() + 1000));
    expect(other.allowed).toBe(true);
  });
});
