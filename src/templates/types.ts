import type { CardOrientation, RelationshipType } from "../data/types.js";

/** §9.2 — one entry in templates/readings.json. */
export interface ReadingTemplate {
  card: string;
  orientation: CardOrientation;
  relationshipType: RelationshipType;
  /** 2-3 sentences, uses {{slots}} (§9.5). */
  synthesis: string;
  /** Single reflective line or question, uses {{slots}}. */
  closing: string;
}

/** §9.3 — which rung of the fallback chain produced a rendered reading. "exact" isn't
 *  numbered in the spec (the chain starts counting at the first *fallback*), kept here for clarity. */
export type TemplateMatchTier = "exact" | "neutral_fallback" | "raw_meaning_fallback" | "placeholder";

export interface RenderedReading {
  synthesis: string;
  closing: string;
  tier: TemplateMatchTier;
}
