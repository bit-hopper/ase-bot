export interface HouseDomain {
  house: number;
  name: string;
  blurb: string;
}

/**
 * The 12 Whole Sign House life domains for the /reading command's "Ground" axis (spec §6.9,
 * §15.7). Adapted from a user-supplied reference doc's house-theme table — trimmed to this
 * project's established short-and-warm register rather than that source's original
 * multi-sentence maximalist phrasing, and checked against the no-clinical/no-moralizing tone
 * rule established during the /pull content-authoring pass (spec §9.5).
 */
const HOUSE_DOMAINS: HouseDomain[] = [
  { house: 1, name: "Self & Identity", blurb: "This is playing out through your own sense of self — how you show up, not how others see you." },
  { house: 2, name: "Money & Value", blurb: "This is playing out in what you own, earn, and consider worth having." },
  { house: 3, name: "Communication & Community", blurb: "This is playing out through conversations, ideas, and the people nearby." },
  { house: 4, name: "Home & Roots", blurb: "This is playing out in your foundations — home, family, the private ground you stand on." },
  { house: 5, name: "Creativity & Romance", blurb: "This is playing out through what you make and who you love." },
  { house: 6, name: "Work & Routines", blurb: "This is playing out in the daily grind — habits, health, the small systems holding everything else up." },
  { house: 7, name: "Partnerships", blurb: "This is playing out between you and one other person — a mirror, not a solo project." },
  { house: 8, name: "Transformation & Shared Resources", blurb: "This is playing out beneath the surface — what's shared, owed, or quietly being let go of." },
  { house: 9, name: "Philosophy & Travel", blurb: "This is playing out through the bigger picture — beliefs, distance, whatever's pulling your view wider." },
  { house: 10, name: "Career & Legacy", blurb: "This is playing out in public — your work, your name, what people see when they look up." },
  { house: 11, name: "Community & Hopes", blurb: "This is playing out through your wider circle — the people you're building toward something with." },
  { house: 12, name: "Rest & the Subconscious", blurb: "This is playing out somewhere quiet — rest, dreams, whatever's working itself out beneath your notice." },
];

if (HOUSE_DOMAINS.length !== 12) {
  throw new Error(`HOUSE_DOMAINS must have exactly 12 entries, got ${HOUSE_DOMAINS.length}`);
}

const BY_HOUSE = new Map(HOUSE_DOMAINS.map((d) => [d.house, d]));

export function houseDomain(house: number): HouseDomain {
  const domain = BY_HOUSE.get(house);
  if (!domain) throw new Error(`Invalid house number: ${house}`);
  return domain;
}
