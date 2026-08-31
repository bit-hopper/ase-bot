import type { Planet, ZodiacSign } from "./types.js";

export interface MajorArcanaEntry {
  /** 0-21, Golden Dawn ordering (The Fool = 0). */
  arcanaNumber: number;
  name: string;
  key: string;
  /** §15.1 — set only for the 12 majors with a zodiac-sign correspondence. */
  correspondingSign: ZodiacSign | null;
  /** §15.2 — set only for the 10 majors with a planetary correspondence. */
  correspondingPlanet: Planet | null;
  /** §9.4 /pull meaning. Synthesized from Waite's PKT descriptive imagery (Part II has no
   *  terse divinatory summary and no reversed meanings for the Majors at all), cross-checked
   *  against learntarot.com's upright keyword themes. */
  uprightMeaning: string;
  reversedMeaning: string;
}

function key(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

interface MajorArcanaSeed {
  name: string;
  uprightMeaning: string;
  reversedMeaning: string;
}

/** Upright meanings enriched from learntarot.com's (Joan Bunning) per-card keyword themes and
 *  description prose — cross-referenced, not copied verbatim (© Joan Bunning). Reversed meanings
 *  are synthesized inversions of the upright (standard tarot practice: reversed = blocked,
 *  excessive, or shadow expression) since no available source gives per-card reversed meanings
 *  for the Majors; existing sources either omit reversed entirely or apply one general uniform
 *  reversal rule. */
const MAJOR_ARCANA_SEED: MajorArcanaSeed[] = [
  { name: "The Fool", uprightMeaning: "A leap into the unknown, spontaneous adventure, faith over certainty, unlimited potential waiting to unfold", reversedMeaning: "Recklessness, hesitating at the obvious leap" },
  { name: "The Magician", uprightMeaning: "Focused will, creative power claimed with clear intent, a conduit between vision and action", reversedMeaning: "Manipulation, untapped potential, scattered focus" },
  { name: "The High Priestess", uprightMeaning: "Guarding the unconscious, unlimited potential held in stillness, truths that reveal themselves only through patience", reversedMeaning: "Secrets withheld too long, disconnection from inner voice" },
  { name: "The Empress", uprightMeaning: "Fertile abundance, sensory pleasure, nurturing rooted in nature's rhythms", reversedMeaning: "Neglect, creative block, smothering care" },
  { name: "The Emperor", uprightMeaning: "Commanding structure, disciplined authority, the steady hand of a protector and provider", reversedMeaning: "Rigidity, domineering control, loss of stability" },
  { name: "The Hierophant", uprightMeaning: "Shared belief and tradition, learning within structured community, guidance through established convention", reversedMeaning: "Rigid dogma, resisting convention, hollow ritual" },
  { name: "The Lovers", uprightMeaning: "Deep union, an attraction beyond reason, a values-driven choice at the crossroads", reversedMeaning: "Misalignment, avoiding the real choice" },
  { name: "The Chariot", uprightMeaning: "Hard-won victory, disciplined self-mastery, forward drive through sheer force of will", reversedMeaning: "Directionless force, losing the reins" },
  { name: "Strength", uprightMeaning: "Quiet inner strength, patient compassion, taming instinct through gentleness rather than force", reversedMeaning: "Self-doubt, force mistaken for strength" },
  { name: "The Hermit", uprightMeaning: "Solitary searching for deeper truth, quiet introspection, wisdom that becomes guidance for others", reversedMeaning: "Isolation, withdrawing too far from others" },
  { name: "Wheel of Fortune", uprightMeaning: "Destiny's turning point, unexpected twists of fate, a wider vision found by stepping back", reversedMeaning: "Resisting change, a run of bad timing" },
  { name: "Justice", uprightMeaning: "Impartial judgment, cause and effect coming due, responsibility weighed and accepted", reversedMeaning: "Imbalance, avoided consequence, skewed judgment" },
  { name: "The Hanged Man", uprightMeaning: "Surrender as strength, a paradox where letting go moves you forward, truth seen from a reversed vantage", reversedMeaning: "Needless martyrdom, stalling instead of yielding" },
  { name: "Death", uprightMeaning: "An inexorable ending, transformation that clears space for what's next, letting go of what no longer serves", reversedMeaning: "Clinging to what's already over, stagnation" },
  { name: "Temperance", uprightMeaning: "Calm equilibrium, patient blending of opposites, the steady center that holds through extremes", reversedMeaning: "Excess, discord between competing needs" },
  { name: "The Devil", uprightMeaning: "Bondage to appetite, willful ignorance of the truth, a self-made cage mistaken for reality", reversedMeaning: "Breaking free, recognizing a self-made cage" },
  { name: "The Tower", uprightMeaning: "Sudden upheaval that forces a wake-up, the collapse of a false structure, a jarring release into clarity", reversedMeaning: "Delayed reckoning, fearing a fall already averted" },
  { name: "The Star", uprightMeaning: "Hope rekindled after despair, quiet inspiration, an open-hearted generosity that restores faith", reversedMeaning: "Disillusionment, faith running dry" },
  { name: "The Moon", uprightMeaning: "Fear and illusion in the dark, imagination running past what's known, finding your way back through the fog", reversedMeaning: "Fear clearing, illusions coming into focus" },
  { name: "The Sun", uprightMeaning: "Radiant vitality, unguarded confidence, clarity and warmth that guarantee success", reversedMeaning: "Clouded optimism, joy delayed not denied" },
  { name: "Judgement", uprightMeaning: "A clear-eyed reckoning, rebirth cleansed of old guilt, an inner calling answered without judgment", reversedMeaning: "Self-doubt, ignoring the call to change" },
  { name: "The World", uprightMeaning: "Wholeness achieved through dynamic balance, fulfillment earned by genuine involvement, a cycle completed through active contribution", reversedMeaning: "Unfinished business, a near-completion that stalls" },
];

/** §15.1 — Major Arcana by zodiac-sign correspondence, keyed by arcana number. */
const SIGN_BY_ARCANA_NUMBER: Partial<Record<number, ZodiacSign>> = {
  4: "aries",
  5: "taurus",
  6: "gemini",
  7: "cancer",
  8: "leo",
  9: "virgo",
  11: "libra",
  13: "scorpio",
  14: "sagittarius",
  15: "capricorn",
  17: "aquarius",
  18: "pisces",
};

/** §15.2 — Major Arcana by planetary correspondence, keyed by arcana number. */
const PLANET_BY_ARCANA_NUMBER: Partial<Record<number, Planet>> = {
  19: "sun",
  2: "moon",
  1: "mercury",
  3: "venus",
  16: "mars",
  10: "jupiter",
  21: "saturn",
  0: "uranus",
  12: "neptune",
  20: "pluto",
};

export const MAJOR_ARCANA: MajorArcanaEntry[] = MAJOR_ARCANA_SEED.map((seed, arcanaNumber) => ({
  arcanaNumber,
  name: seed.name,
  key: key(seed.name),
  correspondingSign: SIGN_BY_ARCANA_NUMBER[arcanaNumber] ?? null,
  correspondingPlanet: PLANET_BY_ARCANA_NUMBER[arcanaNumber] ?? null,
  uprightMeaning: seed.uprightMeaning,
  reversedMeaning: seed.reversedMeaning,
}));

if (MAJOR_ARCANA.length !== 22) {
  throw new Error(`MAJOR_ARCANA must have exactly 22 entries, got ${MAJOR_ARCANA.length}`);
}

export function majorArcanaBySign(sign: ZodiacSign): MajorArcanaEntry {
  const entry = MAJOR_ARCANA.find((m) => m.correspondingSign === sign);
  if (!entry) throw new Error(`No Major Arcana sign correspondence for ${sign}`);
  return entry;
}

export function majorArcanaByPlanet(planet: Planet): MajorArcanaEntry {
  const entry = MAJOR_ARCANA.find((m) => m.correspondingPlanet === planet);
  if (!entry) throw new Error(`No Major Arcana planet correspondence for ${planet}`);
  return entry;
}
