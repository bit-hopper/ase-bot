/** §9.2 — replaces every {{slot}} in `text` with its value; unknown slots are left as-is. */
export function interpolateSlots(text: string, slots: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in slots ? slots[key]! : match));
}
