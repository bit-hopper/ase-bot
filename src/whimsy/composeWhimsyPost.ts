import { ZODIAC_SIGNS, type ZodiacSign } from "../data/types.js";
import { randomBool, randomChoice } from "../random/csprng.js";
import { titleCase } from "../output/textUtils.js";
import { WHIMSY_DIRECTIVE_POOL, WHIMSY_POOL_B_DIRECTIVES, WHIMSY_POOL_B_PUNCHLINES } from "./whimsyFragments.js";

/** ~15% of posts get a punchline, so 85% are directive-only (round 5 lowered this from round 3's
 *  30%, pushing further toward the reference material's mostly-single-line reality). */
const WHIMSY_PUNCHLINE_RATE = 0.15;

/** The dedup-relevant content of one whimsy post — the fields the repeat-avoidance log tracks and
 *  checks (see selectUniqueWhimsyFragments.ts). Deliberately excludes sentence-shape (sign-first
 *  vs. directive-first) — that's a formatting detail, not a fragment choice, and formatWhimsyPost
 *  picks it independently each time it's called. */
export interface WhimsyFragments {
  sign: ZodiacSign;
  directive: string;
  punchline: string | null;
}

/** Directive-first comma form ("{directive}, {sign}.") repositions the directive to
 *  sentence-initial position — only safe for directives with no internal terminal punctuation (a
 *  directive like "put it back!" or "bring an umbrella. You won't need it" would read broken
 *  mid-sentence). Those directives always render in sign-first form instead. */
function isSimpleDirective(directive: string): boolean {
  return !/[.!?]/.test(directive);
}

/** Appends a period unless the text already ends in terminal punctuation. */
function ensureSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** Picks one candidate's fragments: an independently-chosen sign (§2 round 2: "generic, not
 *  sign-flavored"), and a directive with a ~30% chance of a cross-compatible Pool B punchline.
 *  Pure and stateless — has no notion of what's already been posted; selectUniqueWhimsyFragments
 *  is what layers repeat-avoidance on top by calling this repeatedly against post history. */
export function pickWhimsyFragments(): WhimsyFragments {
  const sign = randomChoice(ZODIAC_SIGNS);
  const usePunchline = randomBool(WHIMSY_PUNCHLINE_RATE);

  const directive = usePunchline ? randomChoice(WHIMSY_POOL_B_DIRECTIVES) : randomChoice(WHIMSY_DIRECTIVE_POOL);
  const punchline = usePunchline ? randomChoice(WHIMSY_POOL_B_PUNCHLINES) : null;

  return { sign, directive, punchline };
}

/**
 * Renders fragments into post text, in one of two sentence shapes seen in the source material —
 * sign-first or directive-first, both comma-led — always closing with the ✨ marker that
 * distinguishes whimsy from both the oracular reading voice and the plain phenomena-post register.
 */
export function formatWhimsyPost(fragments: WhimsyFragments): string {
  const { sign, directive, punchline } = fragments;
  const useDirectiveFirst = isSimpleDirective(directive) && randomBool();

  const body = useDirectiveFirst ? `${titleCase(directive)}, ${titleCase(sign)}.` : `${titleCase(sign)}, ${ensureSentence(directive)}`;

  const withPunchline = punchline ? `${body} ${ensureSentence(titleCase(punchline))}` : body;

  return `${withPunchline} ✨`;
}

/** Convenience wrapper for callers that don't need repeat-avoidance (e.g. quick sampling/tests). */
export function composeWhimsyPost(): string {
  return formatWhimsyPost(pickWhimsyFragments());
}
