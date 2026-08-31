import type { Element, ZodiacSign } from "../data/types.js";
import { ZODIAC } from "../data/zodiac.js";
import type { NatalPlacements } from "../tarot/natal.js";
import type { ReplyThread } from "./replyThread.js";
import { titleCase } from "./textUtils.js";

const ELEMENT_GLYPH: Record<Element, string> = { fire: "🔥", water: "💧", air: "🌬️", earth: "🌿" };
/** §10.4 example order (also the tie-break order for "Dominant energy" when counts are equal). */
const ELEMENT_DISPLAY_ORDER: Element[] = ["fire", "water", "air", "earth"];

const BAR_LENGTH = 10;

/** §10.4: "Bar length = (count of that element / 3) x 10 blocks." */
function renderBar(count: number): string {
  const filled = Math.round((count / 3) * BAR_LENGTH);
  return "█".repeat(filled) + "░".repeat(BAR_LENGTH - filled);
}

function elementCounts(natal: NatalPlacements): Record<Element, number> {
  const counts: Record<Element, number> = { fire: 0, water: 0, air: 0, earth: 0 };
  for (const sign of [natal.sun, natal.moon, natal.rising]) {
    if (sign) counts[ZODIAC[sign].element]++;
  }
  return counts;
}

function placementLine(glyph: string, label: string, sign: ZodiacSign | null): string {
  const value = sign ? titleCase(sign) : "Not set";
  return `${glyph} ${label}: ${value}`;
}

/**
 * §10.4 — deviates from the spec mockup's fixed-width `padEnd` column layout. That mockup was
 * written as if for a monospace context, but Bluesky renders post text in a proportional font:
 * padding every label to the same *character* count doesn't produce the same *pixel* width (an
 * "M" is wider than an "S"), so the columns visibly don't line up in the real app — confirmed by
 * viewing a live posted `/chart` reply. There's no way to force column alignment in plain post
 * text on Bluesky, so this uses a colon separator instead of chasing an alignment that's
 * unachievable in the actual medium, rather than keeping output that only looks right in a
 * monospace terminal/editor.
 */
export function formatChart(natal: NatalPlacements): ReplyThread {
  if (!natal.sun && !natal.moon && !natal.rising) {
    return ["You haven't set any placements yet. Try: /set sun [sign] moon [sign] rising [sign]"];
  }

  const placements = [
    placementLine(natal.sun ? ZODIAC[natal.sun].glyph : "☉", "SUN", natal.sun),
    placementLine(natal.moon ? ZODIAC[natal.moon].glyph : "☽", "MOON", natal.moon),
    placementLine(natal.rising ? ZODIAC[natal.rising].glyph : "↑", "RISING", natal.rising),
  ].join("\n");

  const counts = elementCounts(natal);
  // No text label before the bar (unlike placementLine) — the emoji alone unambiguously identifies
  // the element, so dropping the word removes the only source of width variance between rows,
  // and the bars genuinely line up. SUN/MOON/RISING can't use this trick: the zodiac glyph alone
  // doesn't say *which* placement it is, so the word there is load-bearing, not redundant.
  const elementLines = ELEMENT_DISPLAY_ORDER.map((el) => `${ELEMENT_GLYPH[el]} ${renderBar(counts[el])}`).join("\n");

  const dominant = ELEMENT_DISPLAY_ORDER.reduce((best, el) => (counts[el] > counts[best] ? el : best), ELEMENT_DISPLAY_ORDER[0]!);

  return [`${placements}\n\nELEMENTS\n${elementLines}\n\nDominant energy: ${titleCase(dominant)}`];
}
