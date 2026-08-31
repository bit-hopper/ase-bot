import type { RelationshipType } from "../data/types.js";

/** The Sun axis's connector key set: the 6 standard relationship types, plus a 7th case for
 *  when the user has no natal Sun set at all (can't reference a sign that doesn't exist, so it
 *  stands alone rather than reusing "neutral"'s wording). */
export type ThemeConnectorKey = RelationshipType | "noNatalSun";

/** Same shape as ThemeConnectorKey, for the Moon axis. */
export type MoodConnectorKey = RelationshipType | "noNatalMoon";

/**
 * "Theme" (Sun) axis connectors — paired with the card's own upright meaning as
 * `{{cardUprightMeaning}}. {{connector}}`. Slots: {{currentSunSign}}, {{natalSunSign}}.
 * Deliberately reviewed against the Moon connectors below for shared stock phrasing, since both
 * axes always render in the same message (spec §9.6's authoring note).
 */
const SUN_CONNECTORS: Record<ThemeConnectorKey, string> = {
  amplification: "This is your own season, {{natalSunSign}} — the year's energy and yours are one and the same right now.",
  resonance: "{{currentSunSign}}'s energy moves in the same current as your {{natalSunSign}} nature — this season speaks a language you already know.",
  harmony: "{{currentSunSign}}'s focus complements your {{natalSunSign}} instincts — different rhythms, easy to move in together.",
  polarity: "{{currentSunSign}} sits directly across the wheel from your {{natalSunSign}} Sun — this season asks you to meet yourself from the other side.",
  tension: "{{currentSunSign}}'s demands cut against your {{natalSunSign}} grain a little — friction, not conflict, and friction is where growth happens.",
  neutral: "{{currentSunSign}} season is running on its own track right now, apart from your {{natalSunSign}} nature — no clash, no particular pull either.",
  noNatalSun: "This season's energy stands on its own — {{currentSunSign}} sets the tone for everyone right now.",
};

/**
 * "Mood" (Moon) axis connectors — the section body on their own, no card tie-in (the Moon axis
 * has no card of its own). Slots: {{currentMoonSign}}, {{natalMoonSign}}.
 */
const MOON_CONNECTORS: Record<MoodConnectorKey, string> = {
  amplification: "Today's Moon is your own, {{natalMoonSign}} — the sky's emotional current and yours are perfectly aligned right now.",
  resonance: "Transiting {{currentMoonSign}} moves with the same current as your natal {{natalMoonSign}} Moon — today's feelings arrive undiluted, not at odds with your usual depth.",
  harmony: "{{currentMoonSign}}'s mood meets your {{natalMoonSign}} instincts halfway — a gentle pairing, nothing to reconcile.",
  polarity: "{{currentMoonSign}} sits opposite your natal {{natalMoonSign}} Moon — today's mood pulls against your usual center, worth noticing rather than fighting.",
  tension: "{{currentMoonSign}}'s undertow rubs against your {{natalMoonSign}} nature — a little emotional friction today, not danger, just difference.",
  neutral: "{{currentMoonSign}}'s mood is running its own course today, separate from your {{natalMoonSign}} baseline — its own weather system for now.",
  noNatalMoon: "The sky's mood today is {{currentMoonSign}} — no moon sign set to weigh against.",
};

export function sunConnector(key: ThemeConnectorKey): string {
  return SUN_CONNECTORS[key];
}

export function moonConnector(key: MoodConnectorKey): string {
  return MOON_CONNECTORS[key];
}
