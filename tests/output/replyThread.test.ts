import { describe, expect, it } from "vitest";
import { fitsInOnePost, joinSections, POST_CHAR_LIMIT } from "../../src/output/replyThread.js";

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
