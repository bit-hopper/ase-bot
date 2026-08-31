import type { Planet } from "../data/types.js";

/**
 * §8.1's `lifedomainHint` example ("9th House — philosophy, travel, expansion") is a real
 * astrological house, which requires birth time/location and house calculation — both
 * explicitly out of scope until v3 (§16). This field also isn't referenced by any of
 * §9.1's interpolation slots, meaning it's very likely a leftover from the same abandoned
 * LLM-context design as the other unused `relationships.*` prose fields (see §4.1/§8.1's
 * resolved LLM contradiction). Rather than fabricate a fake house, v1 substitutes each
 * anchor planet's classical thematic keywords — real astrological content, just not a house.
 */
const PLANET_DOMAIN_HINT: Record<Planet, string> = {
  sun: "Identity, vitality, self-expression",
  moon: "Emotion, home, instinct",
  mercury: "Communication, thought, exchange",
  venus: "Love, value, harmony",
  mars: "Action, drive, conflict",
  jupiter: "Expansion, philosophy, opportunity",
  saturn: "Structure, discipline, limitation",
  uranus: "Disruption, innovation, freedom",
  neptune: "Dreams, dissolution, spirituality",
  pluto: "Transformation, power, the hidden",
};

export function getLifeDomainHint(anchorPlanet: Planet): string {
  return PLANET_DOMAIN_HINT[anchorPlanet];
}
