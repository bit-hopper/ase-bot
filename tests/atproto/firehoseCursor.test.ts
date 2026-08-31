import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createRedisClient } from "../../src/queue/redisClient.js";
import { createCursorStore } from "../../src/atproto/firehoseCursor.js";

const redis = createRedisClient();

beforeEach(async () => {
  await redis.flushdb();
});

afterAll(async () => {
  await redis.flushdb();
  await redis.quit();
});

describe("createCursorStore", () => {
  it("returns undefined when no cursor has ever been stored", async () => {
    const store = createCursorStore(redis);
    expect(await store.get()).toBeUndefined();
  });

  it("round-trips a stored sequence number", async () => {
    const store = createCursorStore(redis);
    await store.set(12345);
    expect(await store.get()).toBe(12345);
  });

  it("overwrites the previous cursor on each set", async () => {
    const store = createCursorStore(redis);
    await store.set(1);
    await store.set(2);
    expect(await store.get()).toBe(2);
  });

  it("returns the cursor when it's younger than maxAgeMs", async () => {
    const store = createCursorStore(redis, 10_000);
    await store.set(42);
    expect(await store.get()).toBe(42);
  });

  it("discards the cursor once it's older than maxAgeMs (bounds backlog-replay time after a long outage)", async () => {
    const store = createCursorStore(redis, 10_000);
    await store.set(42);

    // Simulate the passage of time by writing an already-stale record directly.
    await redis.set("firehose:cursor", JSON.stringify({ seq: 42, savedAt: Date.now() - 20_000 }));

    expect(await store.get()).toBeUndefined();
  });

  it("treats a pre-migration bare-number cursor as absent rather than crashing", async () => {
    await redis.set("firehose:cursor", "33205786834");
    const store = createCursorStore(redis);
    expect(await store.get()).toBeUndefined();
  });

  it("treats a corrupted (non-JSON) value as absent rather than crashing", async () => {
    await redis.set("firehose:cursor", "not json at all");
    const store = createCursorStore(redis);
    expect(await store.get()).toBeUndefined();
  });
});
