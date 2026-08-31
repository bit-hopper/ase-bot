import type { EclipseEvent } from "../astro/eclipses.js";
import type { MoonPhaseEvent } from "../phenomena/detectMoonPhaseChange.js";
import type { IngressEvent, StationEvent } from "../phenomena/detectStationsAndIngresses.js";
import { phenomenaTemplate } from "../phenomena/phenomenaTemplates.js";
import { interpolateSlots } from "../templates/slots.js";
import type { ReplyThread } from "./replyThread.js";
import { moonPhaseLabel, titleCase } from "./textUtils.js";

/** Phenomena posts are always one short factual sentence — no threading, no ✨. */
export function formatStationEvent(event: StationEvent): ReplyThread {
  const key = event.direction === "retrograde" ? "stationRetrograde" : "stationDirect";
  return [interpolateSlots(phenomenaTemplate(key), { planet: titleCase(event.planet), sign: titleCase(event.sign) })];
}

export function formatIngressEvent(event: IngressEvent): ReplyThread {
  return [interpolateSlots(phenomenaTemplate("ingress"), { planet: titleCase(event.planet), sign: titleCase(event.toSign) })];
}

export function formatEclipseEvent(event: EclipseEvent): ReplyThread {
  const key = event.kind === "lunar" ? "lunarEclipse" : "solarEclipse";
  const date = event.date.toISOString().slice(0, 10);
  return [interpolateSlots(phenomenaTemplate(key), { sign: titleCase(event.sign), date })];
}

export function formatMoonPhaseEvent(event: MoonPhaseEvent): ReplyThread {
  return [interpolateSlots(phenomenaTemplate("moonPhase"), { phase: moonPhaseLabel(event.phase) })];
}
