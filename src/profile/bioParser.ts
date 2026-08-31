import type { ZodiacSign } from "../data/types.js";
import { normalizeSignToken, SIGN_GLYPH_CLASS_SOURCE, SIGN_TOKEN_SOURCE } from "./signAliases.js";
import type { ParsedPlacements, PlacementValue } from "./types.js";

/** §3.2 — "confidence < 0.75 -> treat placement as null." */
export const CONFIDENCE_THRESHOLD = 0.75;

const CLEAN_MATCH_CONFIDENCE = 1.0;
const HEDGED_MATCH_CONFIDENCE = 0.4;
const NO_MATCH_CONFIDENCE = 0;

const HEDGE_WORD_RE = /\b(maybe|probably|possibly|perhaps|i think|kinda|kind of|sort of|might be)\b/i;
const HEDGE_SUFFIX_RE = /^-?ish\b/i;
const HEDGE_LOOKBEHIND_CHARS = 20;
const HEDGE_LOOKAHEAD_CHARS = 4;

type Range = [start: number, end: number];

interface CategoryMatch {
  sign: ZodiacSign;
  range: Range;
}

/** Runs `regex` (auto-forced global+indices) against `bio`, returning the first match whose
 *  captured sign-token range (group 1) doesn't overlap anything in `excludeRanges`. */
function findFirstNonOverlapping(bio: string, regex: RegExp, excludeRanges: Range[]): CategoryMatch | null {
  const flags = new Set(regex.flags.split(""));
  flags.add("g");
  flags.add("d");
  const global = new RegExp(regex.source, [...flags].join(""));

  let m: RegExpExecArray | null;
  while ((m = global.exec(bio))) {
    const indices = (m as RegExpExecArray & { indices: Array<Range | undefined> }).indices;
    const groupRange = indices[1];
    if (groupRange) {
      const [start, end] = groupRange;
      const overlaps = excludeRanges.some(([s, e]) => start < e && end > s);
      if (!overlaps) {
        const sign = normalizeSignToken(bio.slice(start, end));
        if (sign) return { sign, range: [start, end] };
      }
    }
    if (global.lastIndex === m.index) global.lastIndex++; // guard against zero-length matches
  }
  return null;
}

function isHedged(bio: string, range: Range): boolean {
  const [start, end] = range;
  const before = bio.slice(Math.max(0, start - HEDGE_LOOKBEHIND_CHARS), start);
  const after = bio.slice(end, end + HEDGE_LOOKAHEAD_CHARS);
  return HEDGE_WORD_RE.test(before) || HEDGE_SUFFIX_RE.test(after);
}

function toPlacementValue(bio: string, match: CategoryMatch | null): { placement: PlacementValue; range: Range | null } {
  if (!match) {
    return { placement: { value: null, confidence: NO_MATCH_CONFIDENCE }, range: null };
  }

  const confidence = isHedged(bio, match.range) ? HEDGED_MATCH_CONFIDENCE : CLEAN_MATCH_CONFIDENCE;
  // "Do not use low-confidence values in readings" (§3.2) — nulled here so callers can't forget.
  const value = confidence < CONFIDENCE_THRESHOLD ? null : match.sign;
  return { placement: { value, confidence }, range: match.range };
}

// §3.2 pattern lists, tried in order (most specific/least ambiguous first).

const RISING_PATTERNS = [
  // "Sagittarius Rising", "Sag Rising", "♐ Rising", "Sagittarius Asc", "Sag ↑"
  new RegExp(`(${SIGN_TOKEN_SOURCE})\\s*(?:\\brising\\b|\\basc(?:endant)?\\b|↑)`, "i"),
  // "Rising: Sagittarius"
  new RegExp(`\\brising\\b\\s*:?\\s*(${SIGN_TOKEN_SOURCE})`, "i"),
];

const MOON_PATTERNS = [
  // "Pisces Moon", "♓ Moon"
  new RegExp(`(${SIGN_TOKEN_SOURCE})\\s*(?:\\bmoon\\b|🌙)`, "i"),
  // "Moon: Pisces", "🌙 Pisces"
  new RegExp(`(?:\\bmoon\\b\\s*:?\\s*|🌙\\s*)(${SIGN_TOKEN_SOURCE})`, "i"),
];

const SUN_PATTERNS = [
  // "Leo Sun", "Leo sun", "Leo ☀️"
  new RegExp(`(${SIGN_TOKEN_SOURCE})\\s*(?:\\bsun\\b|☀️|☀)`, "i"),
  // "Sun: Leo", "☀️ Leo", "☀ Leo"
  new RegExp(`(?:\\bsun\\b\\s*:?\\s*|☀️\\s*|☀\\s*)(${SIGN_TOKEN_SOURCE})`, "i"),
  // "Leo ♌" — name directly paired with its own glyph, no explicit word. §3.2's Moon list has
  // the identical shape ("Pisces ♓") with no distinguishing feature; resolved toward Sun since
  // that's consistent with the bare-glyph-alone convention below and with Sun's own explicit example.
  new RegExp(`(${SIGN_TOKEN_SOURCE})\\s*(${SIGN_GLYPH_CLASS_SOURCE})`, "i"),
];

// Bare glyph with no adjacent category indicator at all -> Sun (the standalone "♌" example).
const BARE_GLYPH_PATTERN = new RegExp(`(${SIGN_GLYPH_CLASS_SOURCE})`, "");

export function parseBio(bio: string): ParsedPlacements {
  const consumed: Range[] = [];

  const risingMatch = RISING_PATTERNS.reduce<CategoryMatch | null>(
    (found, re) => found ?? findFirstNonOverlapping(bio, re, consumed),
    null,
  );
  if (risingMatch) consumed.push(risingMatch.range);

  const moonMatch = MOON_PATTERNS.reduce<CategoryMatch | null>(
    (found, re) => found ?? findFirstNonOverlapping(bio, re, consumed),
    null,
  );
  if (moonMatch) consumed.push(moonMatch.range);

  let sunMatch = SUN_PATTERNS.reduce<CategoryMatch | null>(
    (found, re) => found ?? findFirstNonOverlapping(bio, re, consumed),
    null,
  );
  if (!sunMatch) {
    sunMatch = findFirstNonOverlapping(bio, BARE_GLYPH_PATTERN, consumed);
  }

  const rising = toPlacementValue(bio, risingMatch);
  const moon = toPlacementValue(bio, moonMatch);
  const sun = toPlacementValue(bio, sunMatch);

  return {
    sun: sun.placement,
    moon: moon.placement,
    rising: rising.placement,
    source: "bio",
  };
}
