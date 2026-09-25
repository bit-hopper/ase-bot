import type { Planet } from "./types.js";

/** /check needs a "what this planet's current placement is about" line per planet — same role
 *  SIGN_KEYWORDS plays for /sign and MOON_PHASE_INTERPRETATION plays for /moon. Short, warm,
 *  present-tense, no fatalism/predictions (§9.5 voice constraints), sign-independent — this is
 *  about the planet itself, not the sign it's currently transiting. */
export const PLANET_MEANING: Record<Planet, string> = {
  sun: "Identity, vitality, the self at center stage.",
  moon: "Instinct, emotion, what you need to feel safe.",
  mercury: "Communication, thought, how you connect the dots.",
  venus: "Love, beauty, what draws you in.",
  mars: "Drive, desire, where you push forward.",
  jupiter: "Growth, luck, the urge to go bigger.",
  saturn: "Structure, discipline, what you're building to last.",
  uranus: "Disruption, invention, the itch to break pattern.",
  neptune: "Dreams, intuition, the pull toward something unseen.",
  pluto: "Transformation, power, what's working beneath the surface.",
};

/** Sun and Moon never retrograde (from Earth's frame, they don't reverse apparent motion), so
 *  they're excluded here — /check's formatter only consults this for the other 8 planets. */
export const PLANET_RETROGRADE_NOTE: Record<Exclude<Planet, "sun" | "moon">, string> = {
  mercury: "Retrograde: mixed signals and reread messages — slow down before hitting send.",
  venus: "Retrograde: old loves and old habits circle back for a second look.",
  mars: "Retrograde: momentum stalls — redirect the push instead of forcing it.",
  jupiter: "Retrograde: growth doesn't stop, it just goes underground for a while.",
  saturn: "Retrograde: a chance to rebuild the foundation before building higher.",
  uranus: "Retrograde: the shake-up starts quietly, on the inside, before it shows.",
  neptune: "Retrograde: the fog thins just enough to see what was actually there.",
  pluto: "Retrograde: the transformation keeps going, just out of view.",
};
