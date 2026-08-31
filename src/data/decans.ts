import type { DecanEntry, TarotSuit } from "./types.js";

const NUMBER_WORDS: Record<number, string> = {
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
};

function cardKey(number: number, suit: TarotSuit): string {
  return `${NUMBER_WORDS[number]}_of_${suit}`;
}

function cardName(number: number, suit: TarotSuit): string {
  const suitName = suit.charAt(0).toUpperCase() + suit.slice(1);
  return `${NUMBER_WORDS[number]!.charAt(0).toUpperCase()}${NUMBER_WORDS[number]!.slice(1)} of ${suitName}`;
}

/**
 * Raw seed rows transcribed verbatim from spec §15.4. `degree` is the decan's
 * starting sign-relative degree (0, 10, or 20); degreeEnd is derived as +10
 * (or 30 for the 3rd decan), producing the half-open [start, end) interval
 * spec §5.2 requires for arcminute-precise boundaries.
 */
const RAW_DECANS: Array<
  Pick<DecanEntry, "sign" | "decan" | "chaldeanRuler" | "suit" | "number" | "uprightMeaning" | "reversedMeaning">
> = [
  { sign: "aries", decan: 1, chaldeanRuler: "mars", suit: "wands", number: 2, uprightMeaning: "Visionary planning, bold initiative", reversedMeaning: "Over-deliberation, fear of launching" },
  { sign: "aries", decan: 2, chaldeanRuler: "sun", suit: "wands", number: 3, uprightMeaning: "Expansion, foresight, ventures returning", reversedMeaning: "Delays, disappointment, looking backward" },
  { sign: "aries", decan: 3, chaldeanRuler: "venus", suit: "wands", number: 4, uprightMeaning: "Celebration, home harmony, stable foundation", reversedMeaning: "Domestic tension, internalized peace, transition" },

  { sign: "taurus", decan: 1, chaldeanRuler: "mercury", suit: "pentacles", number: 5, uprightMeaning: "Scarcity mindset, external loss", reversedMeaning: "Spiritual renewal, structural recovery" },
  { sign: "taurus", decan: 2, chaldeanRuler: "moon", suit: "pentacles", number: 6, uprightMeaning: "Balanced giving, reciprocity", reversedMeaning: "Power dynamics in generosity, strings attached" },
  { sign: "taurus", decan: 3, chaldeanRuler: "saturn", suit: "pentacles", number: 7, uprightMeaning: "Patient assessment, long-term investment", reversedMeaning: "Impatience, wasted effort, short-termism" },

  { sign: "gemini", decan: 1, chaldeanRuler: "jupiter", suit: "swords", number: 8, uprightMeaning: "Feeling boxed in, limits of your own making", reversedMeaning: "A mental unlock, seeing the alternatives" },
  { sign: "gemini", decan: 2, chaldeanRuler: "mars", suit: "swords", number: 9, uprightMeaning: "A racing mind, worry that won't let you rest", reversedMeaning: "Fear loosening its grip, a clearer look at what's real" },
  { sign: "gemini", decan: 3, chaldeanRuler: "sun", suit: "swords", number: 10, uprightMeaning: "A hard ending, nowhere left to fall", reversedMeaning: "Overdue reinvention, early healing" },

  { sign: "cancer", decan: 1, chaldeanRuler: "venus", suit: "cups", number: 2, uprightMeaning: "Alchemical bond, mutual partnership", reversedMeaning: "Misaligned values, broken contracts" },
  { sign: "cancer", decan: 2, chaldeanRuler: "mercury", suit: "cups", number: 3, uprightMeaning: "Communal celebration, collaborative milestone", reversedMeaning: "Overindulgence, superficial ties" },
  { sign: "cancer", decan: 3, chaldeanRuler: "moon", suit: "cups", number: 4, uprightMeaning: "Introspection, dynamic stagnation", reversedMeaning: "Renewed motivation, noticing unseen options" },

  { sign: "leo", decan: 1, chaldeanRuler: "saturn", suit: "wands", number: 5, uprightMeaning: "Creative friction, competition, growth-testing", reversedMeaning: "Chaotic infighting, bypassing necessary struggle" },
  { sign: "leo", decan: 2, chaldeanRuler: "jupiter", suit: "wands", number: 6, uprightMeaning: "Public victory, hard-won validation", reversedMeaning: "Fall from grace, hollow confidence" },
  { sign: "leo", decan: 3, chaldeanRuler: "mars", suit: "wands", number: 7, uprightMeaning: "Defending your position, high ground", reversedMeaning: "Exhaustion, yielding under pressure" },

  { sign: "virgo", decan: 1, chaldeanRuler: "sun", suit: "pentacles", number: 8, uprightMeaning: "Relentless craft, skill-building", reversedMeaning: "Perfectionism stalling output, rushed work" },
  { sign: "virgo", decan: 2, chaldeanRuler: "venus", suit: "pentacles", number: 9, uprightMeaning: "Material sovereignty, solitary abundance", reversedMeaning: "Overspending for status, gilded cage" },
  { sign: "virgo", decan: 3, chaldeanRuler: "mercury", suit: "pentacles", number: 10, uprightMeaning: "Generational legacy, permanent architecture", reversedMeaning: "Cracks in the foundation, short-term thinking" },

  { sign: "libra", decan: 1, chaldeanRuler: "moon", suit: "swords", number: 2, uprightMeaning: "Strategic stalemate, objective ceasefire", reversedMeaning: "Forced choice, exposure of hidden truth" },
  { sign: "libra", decan: 2, chaldeanRuler: "saturn", suit: "swords", number: 3, uprightMeaning: "Separation, structural purge of illusion", reversedMeaning: "Unresolved grief, denial of loss" },
  { sign: "libra", decan: 3, chaldeanRuler: "jupiter", suit: "swords", number: 4, uprightMeaning: "Enforced rest, a body and mind that need to heal", reversedMeaning: "Returning too soon, running on empty" },

  { sign: "scorpio", decan: 1, chaldeanRuler: "mars", suit: "cups", number: 5, uprightMeaning: "Grief, focus on what was lost", reversedMeaning: "Moving past sorrow, reclaiming what remains" },
  { sign: "scorpio", decan: 2, chaldeanRuler: "sun", suit: "cups", number: 6, uprightMeaning: "Ancestral memory, nostalgic gifts", reversedMeaning: "Clinging to the past, nostalgic distortion" },
  { sign: "scorpio", decan: 3, chaldeanRuler: "venus", suit: "cups", number: 7, uprightMeaning: "Overwhelm of options, illusion", reversedMeaning: "Resolving illusion, grounding a vision" },

  { sign: "sagittarius", decan: 1, chaldeanRuler: "mercury", suit: "wands", number: 8, uprightMeaning: "Swift movement, rapid alignment", reversedMeaning: "Miscalculated speed, scattered energy" },
  { sign: "sagittarius", decan: 2, chaldeanRuler: "moon", suit: "wands", number: 9, uprightMeaning: "Resilience, fortress mentality, final push", reversedMeaning: "Dropping guard, boundary fatigue" },
  { sign: "sagittarius", decan: 3, chaldeanRuler: "saturn", suit: "wands", number: 10, uprightMeaning: "Heavy burdens, duty, overextension", reversedMeaning: "Collapse, delegation, releasing the load" },

  { sign: "capricorn", decan: 1, chaldeanRuler: "jupiter", suit: "pentacles", number: 2, uprightMeaning: "Dynamic balance, constant adaptation", reversedMeaning: "Chaotic juggling, dropping responsibilities" },
  { sign: "capricorn", decan: 2, chaldeanRuler: "mars", suit: "pentacles", number: 3, uprightMeaning: "Elite collaboration, masterful design", reversedMeaning: "Poor teamwork, misaligned blueprints" },
  { sign: "capricorn", decan: 3, chaldeanRuler: "sun", suit: "pentacles", number: 4, uprightMeaning: "Financial control, protecting reserves", reversedMeaning: "Holding on too tightly, fear masquerading as caution" },

  { sign: "aquarius", decan: 1, chaldeanRuler: "venus", suit: "swords", number: 5, uprightMeaning: "A win that costs more than it's worth, conflict with no real winner", reversedMeaning: "Empty resolution, long-term cost of winning" },
  { sign: "aquarius", decan: 2, chaldeanRuler: "mercury", suit: "swords", number: 6, uprightMeaning: "Moving toward calmer waters", reversedMeaning: "Stuck in transition, baggage weighing you down" },
  { sign: "aquarius", decan: 3, chaldeanRuler: "moon", suit: "swords", number: 7, uprightMeaning: "A quiet advantage, working around the obstacle", reversedMeaning: "A plan unraveling, the truth coming to light" },

  { sign: "pisces", decan: 1, chaldeanRuler: "saturn", suit: "cups", number: 8, uprightMeaning: "Conscious departure, walking away", reversedMeaning: "Reluctance to leave, staying for a safety that's stopped serving you" },
  { sign: "pisces", decan: 2, chaldeanRuler: "jupiter", suit: "cups", number: 9, uprightMeaning: "Wish fulfillment, self-contained abundance", reversedMeaning: "Dissatisfaction despite success, overindulgence" },
  { sign: "pisces", decan: 3, chaldeanRuler: "mars", suit: "cups", number: 10, uprightMeaning: "Emotional legacy, family harmony", reversedMeaning: "Fractured bonds, illusion of harmony" },
];

export const DECAN_MATRIX: DecanEntry[] = RAW_DECANS.map((row) => {
  const degreeStart = (row.decan - 1) * 10;
  const degreeEnd = row.decan === 3 ? 30 : degreeStart + 10;
  return {
    ...row,
    degreeStart,
    degreeEnd,
    cardKey: cardKey(row.number, row.suit),
    cardName: cardName(row.number, row.suit),
  };
});

if (DECAN_MATRIX.length !== 36) {
  throw new Error(`DECAN_MATRIX must have exactly 36 entries, got ${DECAN_MATRIX.length}`);
}

/**
 * Maps a sign and sign-relative decimal degree (0-30) to its decan entry.
 * Half-open intervals: degree must be >= degreeStart and < degreeEnd.
 */
export function findDecan(sign: DecanEntry["sign"], degreeInSign: number): DecanEntry {
  const entry = DECAN_MATRIX.find(
    (d) => d.sign === sign && degreeInSign >= d.degreeStart && degreeInSign < d.degreeEnd,
  );
  if (!entry) {
    throw new Error(`No decan found for ${sign} at ${degreeInSign}°`);
  }
  return entry;
}
