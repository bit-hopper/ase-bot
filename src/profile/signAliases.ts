import { ZODIAC_SIGNS, type ZodiacSign } from "../data/types.js";
import { ZODIAC } from "../data/zodiac.js";

/** §3.2 only ever gives one non-glyph abbreviation ("Sag Rising", "Sag ↑") — kept minimal
 *  per the plan's note that broader bio-pattern coverage is a v1 iteration risk, not
 *  something to guess at now. */
const EXTRA_NAME_ALIASES: Partial<Record<ZodiacSign, string[]>> = {
  sagittarius: ["sag"],
};

export const SIGN_NAME_ALIASES: Array<{ sign: ZodiacSign; alias: string }> = ZODIAC_SIGNS.flatMap((sign) =>
  [sign, ...(EXTRA_NAME_ALIASES[sign] ?? [])].map((alias) => ({ sign, alias })),
);

export const SIGN_GLYPH_ALIASES: Array<{ sign: ZodiacSign; glyph: string }> = ZODIAC_SIGNS.map((sign) => ({
  sign,
  glyph: ZODIAC[sign].glyph,
}));

/** §3.3 step 1 — strict validation against the canonical 12-sign list (full names only,
 *  no glyphs/abbreviations). Used by /set, which expects the user to type the sign out. */
export function parseCanonicalSign(input: string): ZodiacSign | null {
  const lower = input.trim().toLowerCase();
  return (ZODIAC_SIGNS as readonly string[]).includes(lower) ? (lower as ZodiacSign) : null;
}

export function normalizeSignToken(token: string): ZodiacSign | null {
  const trimmed = token.trim();
  const byGlyph = SIGN_GLYPH_ALIASES.find((a) => a.glyph === trimmed);
  if (byGlyph) return byGlyph.sign;

  const lower = trimmed.toLowerCase();
  const byName = SIGN_NAME_ALIASES.find((a) => a.alias === lower);
  return byName?.sign ?? null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SIGN_NAME_SOURCE = SIGN_NAME_ALIASES.map((a) => escapeRegex(a.alias)).join("|");
const SIGN_GLYPH_SOURCE = SIGN_GLYPH_ALIASES.map((a) => escapeRegex(a.glyph)).join("");

/** Matches a full sign name/alias (word-bounded) or a single zodiac glyph. */
export const SIGN_TOKEN_SOURCE = `(?:\\b(?:${SIGN_NAME_SOURCE})\\b|[${SIGN_GLYPH_SOURCE}])`;

/** Character class source for "any zodiac glyph", reused by the bare-glyph-implies-Sun fallback. */
export const SIGN_GLYPH_CLASS_SOURCE = `[${SIGN_GLYPH_SOURCE}]`;

/** Standard dynamic-programming edit distance — how many single-character insertions,
 *  deletions, or substitutions turn `a` into `b`. */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: b.length + 1 }, () => new Array<number>(a.length + 1).fill(0));
  for (let i = 0; i <= b.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0]![j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i]![j] = Math.min(matrix[i - 1]![j]! + 1, matrix[i]![j - 1]! + 1, matrix[i - 1]![j - 1]! + cost);
    }
  }
  return matrix[b.length]![a.length]!;
}

/**
 * Typo-tolerant sign lookup for the /reading command's inline args (spec §4.4 — the first
 * fuzzy-matching logic in this codebase, deliberately scoped to this one entry point rather
 * than folded into /set's strict `parseCanonicalSign`).
 * Tries an exact match first, then the nearest of the 12 signs within `maxDistance` edits —
 * returns null (not a guess) when nothing is close enough, e.g. for outright gibberish.
 */
export function fuzzyMatchSign(input: string, maxDistance = 2): ZodiacSign | null {
  const exact = parseCanonicalSign(input);
  if (exact) return exact;

  const lower = input.trim().toLowerCase();
  let best: ZodiacSign | null = null;
  let bestDistance = maxDistance + 1;

  for (const sign of ZODIAC_SIGNS) {
    const distance = levenshteinDistance(lower, sign);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = sign;
    }
  }

  return bestDistance <= maxDistance ? best : null;
}
