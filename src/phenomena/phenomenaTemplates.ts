/**
 * Bare-fact templates for phenomena posts — deliberately plain/factual, no synthesis, no ✨
 * (contrast with the whimsy feature's whimsical voice). Small hand-written library, same pattern
 * as reading/readingConnectors.ts, not the big JSON/fallback-chain system /divine uses.
 */
export type PhenomenaTemplateKey = "stationRetrograde" | "stationDirect" | "ingress" | "lunarEclipse" | "solarEclipse" | "moonPhase";

const PHENOMENA_TEMPLATES: Record<PhenomenaTemplateKey, string> = {
  stationRetrograde: "{{planet}} turns retrograde in {{sign}}.",
  stationDirect: "{{planet}} turns direct in {{sign}}.",
  ingress: "{{planet}} enters {{sign}}.",
  lunarEclipse: "Lunar eclipse in {{sign}} on {{date}}.",
  solarEclipse: "Solar eclipse in {{sign}} on {{date}}.",
  moonPhase: "{{phase}} today.",
};

export function phenomenaTemplate(key: PhenomenaTemplateKey): string {
  return PHENOMENA_TEMPLATES[key];
}
