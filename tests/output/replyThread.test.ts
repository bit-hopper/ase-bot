import { describe, expect, it } from "vitest";
import { fitsInOnePost, joinSections, packBlocksIntoThread, POST_CHAR_LIMIT } from "../../src/output/replyThread.js";

describe("fitsInOnePost", () => {
  it("fits exactly at the limit", () => {
    expect(fitsInOnePost("x".repeat(POST_CHAR_LIMIT))).toBe(true);
  });

  it("does not fit one over the limit", () => {
    expect(fitsInOnePost("x".repeat(POST_CHAR_LIMIT + 1))).toBe(false);
  });
});

describe("joinSections", () => {
  it("joins with blank lines", () => {
    expect(joinSections("a", "b", "c")).toBe("a\n\nb\n\nc");
  });

  it("skips empty sections", () => {
    expect(joinSections("a", "", "c")).toBe("a\n\nc");
  });
});

describe("packBlocksIntoThread", () => {
  it("packs multiple short blocks into one post when they fit together", () => {
    const thread = packBlocksIntoThread(["a", "b", "c"]);
    expect(thread).toEqual(["a\n\nb\n\nc"]);
  });

  it("starts a new post once the next block would overflow the running total", () => {
    const a = "x".repeat(100);
    const b = "y".repeat(100);
    const c = "z".repeat(100);
    const thread = packBlocksIntoThread([a, b, c]);
    expect(thread).toEqual([`${a}\n\n${b}`, c]);
    for (const post of thread) expect(fitsInOnePost(post)).toBe(true);
  });

  it("keeps a block that alone exceeds the limit intact as its own post", () => {
    const oversized = "x".repeat(POST_CHAR_LIMIT + 50);
    const thread = packBlocksIntoThread(["short", oversized, "also short"]);
    expect(thread).toEqual(["short", oversized, "also short"]);
  });

  it("preserves block order across multiple posts", () => {
    // Each block is too big to share a post with another, so this also confirms one-block-per-post.
    const blocks = ["a".repeat(200), "b".repeat(200), "c".repeat(200)];
    expect(packBlocksIntoThread(blocks)).toEqual(blocks);
  });

  it("returns an empty thread for no blocks", () => {
    expect(packBlocksIntoThread([])).toEqual([]);
  });
});
