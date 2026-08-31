import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { createRedisClient } from "../../src/queue/redisClient.js";
import { createWhimsyQueue } from "../../src/queue/whimsyQueue.js";
import { processWhimsyPost, type ProcessWhimsyPostDeps } from "../../src/queue/processWhimsyPost.js";
import { recordWhimsyPost } from "../../src/whimsy/whimsyPostLog.js";

const pool = getPool();
const connection = createRedisClient();
const flushConnection = createRedisClient();

beforeEach(async () => {
  await pool.query("TRUNCATE whimsy_post_log");
  await flushConnection.flushdb();
});

afterAll(async () => {
  await pool.query("TRUNCATE whimsy_post_log");
  await flushConnection.quit();
  await connection.quit();
  await pool.end();
});

function makeDeps(overrides: Partial<ProcessWhimsyPostDeps> = {}) {
  const posted: string[] = [];
  const queue = createWhimsyQueue(connection);
  const deps: ProcessWhimsyPostDeps = {
    pool,
    queue,
    postStandalone: async (text) => {
      posted.push(text);
    },
    now: () => new Date("2026-02-10T18:00:00Z"), // 10am PST — mid-window
    ...overrides,
  };
  return { deps, posted, queue };
}

describe("processWhimsyPost", () => {
  it("posts, logs the post, and schedules the next tick", async () => {
    const { deps, posted, queue } = makeDeps();
    try {
      await processWhimsyPost(deps);

      expect(posted).toHaveLength(1);
      expect(posted[0]).toContain("✨");

      const logRows = await pool.query("SELECT COUNT(*) FROM whimsy_post_log");
      expect(Number(logRows.rows[0]!.count)).toBe(1);

      const counts = await queue.getJobCounts("delayed", "waiting");
      expect((counts.delayed ?? 0) + (counts.waiting ?? 0)).toBe(1);
    } finally {
      await queue.close();
    }
  });

  it("still schedules the next tick even when posting fails, and does not log the failed attempt", async () => {
    const { deps, queue } = makeDeps({
      postStandalone: async () => {
        throw new Error("simulated network failure");
      },
    });
    try {
      await expect(processWhimsyPost(deps)).rejects.toThrow("simulated network failure");

      const logRows = await pool.query("SELECT COUNT(*) FROM whimsy_post_log");
      expect(Number(logRows.rows[0]!.count)).toBe(0);

      const counts = await queue.getJobCounts("delayed", "waiting");
      expect((counts.delayed ?? 0) + (counts.waiting ?? 0)).toBe(1);
    } finally {
      await queue.close();
    }
  });

  it("does not repeat the immediately-preceding sign", async () => {
    await recordWhimsyPost(pool, { sign: "leo", directive: "buy new socks", punchline: null });

    const { deps, posted, queue } = makeDeps();
    try {
      await processWhimsyPost(deps);
      expect(posted[0]).not.toMatch(/^Leo:/);
      expect(posted[0]).not.toContain(", Leo.");
    } finally {
      await queue.close();
    }
  });
});
