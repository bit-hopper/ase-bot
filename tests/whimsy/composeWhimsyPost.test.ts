import { describe, expect, it } from "vitest";
import { composeWhimsyPost } from "../../src/whimsy/composeWhimsyPost.js";
import { fitsInOnePost } from "../../src/output/replyThread.js";
import { WHIMSY_POOL_B_PUNCHLINES } from "../../src/whimsy/whimsyFragments.js";
import { ZODIAC_SIGNS } from "../../src/data/types.js";

describe("composeWhimsyPost (spec §9.7)", () => {
  it("always fits in one Bluesky post and ends with the whimsy ✨ marker", () => {
    for (let i = 0; i < 500; i++) {
      const post = composeWhimsyPost();
      expect(fitsInOnePost(post)).toBe(true);
      expect(post.endsWith(" ✨")).toBe(true);
    }
  });

  it("always names exactly one zodiac sign, title-cased", () => {
    for (let i = 0; i < 300; i++) {
      const post = composeWhimsyPost();
      const matches = ZODIAC_SIGNS.filter((sign) => post.includes(`${sign.charAt(0).toUpperCase()}${sign.slice(1)}`));
      expect(matches.length).toBe(1);
    }
  });

  it("covers all 12 signs over many trials", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const post = composeWhimsyPost();
      const sign = ZODIAC_SIGNS.find((s) => post.includes(`${s.charAt(0).toUpperCase()}${s.slice(1)}`));
      if (sign) seen.add(sign);
    }
    expect(seen.size).toBe(ZODIAC_SIGNS.length);
  });

  it("appends a Pool B punchline on roughly 30% of posts over many trials", () => {
    const n = 4000;
    let withPunchline = 0;
    for (let i = 0; i < n; i++) {
      const post = composeWhimsyPost();
      if (WHIMSY_POOL_B_PUNCHLINES.some((p) => post.toLowerCase().includes(p.toLowerCase()))) withPunchline++;
    }
    const rate = withPunchline / n;
    expect(rate).toBeGreaterThan(0.24);
    expect(rate).toBeLessThan(0.36);
  });

  it("uses both the colon-led and comma-led sentence shapes over many trials", () => {
    let colonForm = 0;
    let commaForm = 0;
    const n = 500;
    for (let i = 0; i < n; i++) {
      const post = composeWhimsyPost();
      const sign = ZODIAC_SIGNS.find((s) => post.includes(`${s.charAt(0).toUpperCase()}${s.slice(1)}`))!;
      const signTitle = `${sign.charAt(0).toUpperCase()}${sign.slice(1)}`;
      if (post.startsWith(`${signTitle}:`)) colonForm++;
      else if (post.includes(`, ${signTitle}.`)) commaForm++;
    }
    expect(colonForm).toBeGreaterThan(0);
    expect(commaForm).toBeGreaterThan(0);
  });
});
