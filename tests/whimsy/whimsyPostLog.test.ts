import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getPool } from "../../src/db/client.js";
import { getRecentWhimsyPosts, recordWhimsyPost } from "../../src/whimsy/whimsyPostLog.js";
import type { WhimsyFragments } from "../../src/whimsy/composeWhimsyPost.js";

const pool = getPool();

beforeEach(async () => {
  await pool.query("TRUNCATE whimsy_post_log");
});

afterAll(async () => {
  await pool.query("TRUNCATE whimsy_post_log");
  await pool.end();
});

function fragments(overrides: Partial<WhimsyFragments> = {}): WhimsyFragments {
  return { sign: "aries", directive: "buy new socks", punchline: null, ...overrides };
}

describe("whimsyPostLog", () => {
  it("returns an empty array when the table is empty", async () => {
    expect(await getRecentWhimsyPosts(pool, 50)).toEqual([]);
  });

  it("round-trips sign, directive, and a null punchline", async () => {
    await recordWhimsyPost(pool, fragments());
    const rows = await getRecentWhimsyPosts(pool, 50);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.sign).toBe("aries");
    expect(rows[0]!.directive).toBe("buy new socks");
    expect(rows[0]!.punchline).toBeNull();
    expect(rows[0]!.postedAt).toBeInstanceOf(Date);
  });

  it("round-trips a non-null punchline", async () => {
    await recordWhimsyPost(pool, fragments({ punchline: "trust the process" }));
    const rows = await getRecentWhimsyPosts(pool, 50);
    expect(rows[0]!.punchline).toBe("trust the process");
  });

  it("returns rows newest-first", async () => {
    await recordWhimsyPost(pool, fragments({ sign: "aries" }));
    await recordWhimsyPost(pool, fragments({ sign: "taurus" }));
    await recordWhimsyPost(pool, fragments({ sign: "gemini" }));

    const rows = await getRecentWhimsyPosts(pool, 50);
    expect(rows.map((r) => r.sign)).toEqual(["gemini", "taurus", "aries"]);
  });

  it("respects the limit", async () => {
    for (let i = 0; i < 5; i++) await recordWhimsyPost(pool, fragments());
    const rows = await getRecentWhimsyPosts(pool, 3);
    expect(rows).toHaveLength(3);
  });
});
