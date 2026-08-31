import { describe, expect, it } from "vitest";
import { isWhimsyPostAllowed, selectUniqueWhimsyFragments } from "../../src/whimsy/selectUniqueWhimsyFragments.js";
import type { WhimsyFragments } from "../../src/whimsy/composeWhimsyPost.js";
import type { WhimsyPostLogRow } from "../../src/whimsy/whimsyPostLog.js";
import { ZODIAC_SIGNS } from "../../src/data/types.js";

function row(overrides: Partial<WhimsyPostLogRow> = {}): WhimsyPostLogRow {
  return { sign: "aries", directive: "buy new socks", punchline: null, postedAt: new Date(), ...overrides };
}

function fragments(overrides: Partial<WhimsyFragments> = {}): WhimsyFragments {
  return { sign: "taurus", directive: "buy the smaller one", punchline: null, ...overrides };
}

describe("isWhimsyPostAllowed (repeat-avoidance rules)", () => {
  it("allows anything against empty history", () => {
    expect(isWhimsyPostAllowed(fragments(), [])).toBe(true);
  });

  it("rejects repeating the immediately-preceding sign", () => {
    const history = [row({ sign: "taurus" })];
    expect(isWhimsyPostAllowed(fragments({ sign: "taurus" }), history)).toBe(false);
    expect(isWhimsyPostAllowed(fragments({ sign: "gemini" }), history)).toBe(true);
  });

  it("rejects reusing a directive seen within the last 10 posts, regardless of sign", () => {
    const history = [row({ sign: "leo", directive: "buy the smaller one" })];
    expect(isWhimsyPostAllowed(fragments({ sign: "gemini", directive: "buy the smaller one" }), history)).toBe(false);
  });

  it("allows reusing a directive once it's aged out of the 10-post lookback", () => {
    const history = Array.from({ length: 10 }, () => row({ sign: "leo", directive: "some other directive" }));
    history.push(row({ sign: "leo", directive: "buy the smaller one" })); // the 11th-most-recent
    // isWhimsyPostAllowed only sees what it's given — simulate the caller passing exactly the
    // last 10 by slicing before the 11th entry lands in the fragment window.
    const last10 = history.slice(0, 10);
    expect(last10.some((r) => r.directive === "buy the smaller one")).toBe(false);
    expect(isWhimsyPostAllowed(fragments({ sign: "gemini", directive: "buy the smaller one" }), last10)).toBe(true);
  });

  it("rejects reusing a non-null punchline seen within the last 10 posts, regardless of sign", () => {
    const history = [row({ sign: "leo", directive: "clean one window", punchline: "trust the process" })];
    expect(isWhimsyPostAllowed(fragments({ sign: "gemini", directive: "throw out one expired thing", punchline: "trust the process" }), history)).toBe(
      false,
    );
  });

  it("never rejects on a null punchline matching another null punchline", () => {
    const history = [row({ sign: "leo", directive: "other directive", punchline: null })];
    expect(isWhimsyPostAllowed(fragments({ sign: "gemini", punchline: null }), history)).toBe(true);
  });

  it("rejects an exact (sign, directive, punchline) combo seen within the last 50 posts even past the 10-post fragment window", () => {
    const filler = Array.from({ length: 15 }, (_, i) => row({ sign: "leo", directive: `filler ${i}`, punchline: null }));
    const exactMatch = row({ sign: "taurus", directive: "buy the smaller one", punchline: "trust the process" });
    const history = [...filler, exactMatch];

    const candidate = fragments({ sign: "taurus", directive: "buy the smaller one", punchline: "trust the process" });
    expect(isWhimsyPostAllowed(candidate, history)).toBe(false);
  });
});

describe("selectUniqueWhimsyFragments", () => {
  it("returns fragments that pass isWhimsyPostAllowed against the given history, over many trials", () => {
    for (let i = 0; i < 200; i++) {
      const history = [row({ sign: "leo" })];
      const selected = selectUniqueWhimsyFragments(history);
      expect(isWhimsyPostAllowed(selected, history)).toBe(true);
    }
  });

  it("never returns a sign outside the 12 zodiac signs", () => {
    for (let i = 0; i < 200; i++) {
      const selected = selectUniqueWhimsyFragments([]);
      expect(ZODIAC_SIGNS).toContain(selected.sign);
    }
  });
});
