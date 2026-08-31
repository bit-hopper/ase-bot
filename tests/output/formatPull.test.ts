import { describe, expect, it } from "vitest";
import { formatPull } from "../../src/output/formatPull.js";
import { fitsInOnePost } from "../../src/output/replyThread.js";

describe("formatPull (§10.2)", () => {
  it("returns a single post when it fits", () => {
    const thread = formatPull({ cardName: "Seven of Wands", orientationLine: "Upright · Fire", meaning: "Defending your position, high ground" });
    expect(thread).toHaveLength(1);
    expect(thread[0]).toContain("🔮 Seven of Wands");
    expect(thread[0]).toContain("Upright · Fire");
    expect(thread[0]).toContain("Defending your position, high ground");
  });

  it("splits into a 2-post thread when the combined header+meaning exceeds 300 chars", () => {
    const longMeaning = "x".repeat(280); // fits alone, but not combined with the header block
    const thread = formatPull({ cardName: "Seven of Wands", orientationLine: "Upright · Fire", meaning: longMeaning });
    expect(thread).toHaveLength(2);
    expect(thread[0]).toContain("🔮 Seven of Wands");
    expect(thread[1]).toBe(longMeaning);
    for (const post of thread) expect(fitsInOnePost(post)).toBe(true);
  });
});
