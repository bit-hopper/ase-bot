import { describe, expect, it } from "vitest";
import { WHIMSY_DIRECTIVE_POOL, WHIMSY_POOL_A, WHIMSY_POOL_B_DIRECTIVES, WHIMSY_POOL_B_PUNCHLINES } from "../../src/whimsy/whimsyFragments.js";

/** Spec §9.7's whimsy content-boundary list, checked as a lightweight regression guard — not
 *  exhaustive, but catches an obvious regression if a future edit reintroduces a forbidden
 *  category (real medical/financial/legal advice, real handles, slurs). */
const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bsell your stocks?\b/i,
  /\bskip (your )?meds?\b/i,
  /\bquit your job\b/i,
  /@[a-z0-9._-]+\.[a-z]{2,}/i, // handle-shaped mentions
];

function allEntries(): readonly string[] {
  return [...WHIMSY_POOL_A, ...WHIMSY_POOL_B_DIRECTIVES, ...WHIMSY_POOL_B_PUNCHLINES];
}

describe("whimsy fragment pools (spec §9.7)", () => {
  it("Pool A has no case-insensitive duplicates", () => {
    const normalized = WHIMSY_POOL_A.map((s) => s.toLowerCase());
    expect(new Set(normalized).size).toBe(WHIMSY_POOL_A.length);
  });

  it("Pool B directives have no duplicates and don't overlap Pool B punchlines' wording", () => {
    expect(new Set(WHIMSY_POOL_B_DIRECTIVES.map((s) => s.toLowerCase())).size).toBe(WHIMSY_POOL_B_DIRECTIVES.length);
    expect(new Set(WHIMSY_POOL_B_PUNCHLINES.map((s) => s.toLowerCase())).size).toBe(WHIMSY_POOL_B_PUNCHLINES.length);
  });

  it("Pool A is meaningfully larger than the original ~20-line target", () => {
    expect(WHIMSY_POOL_A.length).toBeGreaterThan(100);
  });

  it("Pool B has ~10 directives and ~80 punchlines (round 4: punchlines grown for a longer repeat cycle)", () => {
    expect(WHIMSY_POOL_B_DIRECTIVES.length).toBeGreaterThanOrEqual(10);
    expect(WHIMSY_POOL_B_PUNCHLINES.length).toBeGreaterThanOrEqual(80);
  });

  it("Pool B punchlines don't collide with any Pool A entry (repetition-defeating regression guard)", () => {
    const normA = new Set(WHIMSY_POOL_A.map((s) => s.toLowerCase()));
    for (const p of WHIMSY_POOL_B_PUNCHLINES) {
      expect(normA.has(p.toLowerCase()), `"${p}" duplicates a Pool A entry`).toBe(false);
    }
  });

  it("Pool B's directives fold into the combined directive-only pool", () => {
    for (const d of WHIMSY_POOL_B_DIRECTIVES) {
      expect(WHIMSY_DIRECTIVE_POOL).toContain(d);
    }
    expect(WHIMSY_DIRECTIVE_POOL.length).toBe(WHIMSY_POOL_A.length + WHIMSY_POOL_B_DIRECTIVES.length);
  });

  it("no entry trips the content-boundary forbidden-pattern guard", () => {
    for (const entry of allEntries()) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(entry, `"${entry}" matched forbidden pattern ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("every entry is a short fragment, not a full paragraph (sanity bound on authoring style)", () => {
    for (const entry of allEntries()) {
      expect(entry.length, `"${entry}" is too long for a fragment`).toBeLessThan(120);
    }
  });

  it("no entry is empty or whitespace-only", () => {
    for (const entry of allEntries()) {
      expect(entry.trim().length).toBeGreaterThan(0);
    }
  });
});
