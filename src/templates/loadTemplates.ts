import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReadingTemplate } from "./types.js";

/** §17.3 — the static template library file, bundled with the app (no external service at runtime). */
export const DEFAULT_TEMPLATES_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates", "readings.json");

export function loadReadingTemplates(path: string = DEFAULT_TEMPLATES_PATH): ReadingTemplate[] {
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as ReadingTemplate[];
}
