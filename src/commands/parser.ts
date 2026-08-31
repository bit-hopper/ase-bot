/** §4.1 — the 8 v1 commands. v2 commands (/compat, /transit, /weekly, ...) are
 *  intentionally absent. `divine` is the renamed original /reading engine —
 *  `reading` now means the new Sun/Moon/Rising Big Three command.
 *  `/daily` was dropped: it shared /reading's exact pipeline and, in practice, its output too
 *  (the only difference — a 00:00 UTC ephemeris pin vs. live "now" — almost never showed up,
 *  since the Moon rarely crosses a sign boundary within the same UTC day). */
export const V1_COMMANDS = ["help", "set", "sign", "pull", "reading", "divine", "moon", "chart"] as const;
export type CommandName = (typeof V1_COMMANDS)[number];

export interface ParsedCommand {
  /** null when no recognized command token is present (§4.3: reply with /help summary). */
  command: CommandName | null;
  /** Everything after the command token, trimmed. */
  args: string;
}

const COMMAND_TOKEN = /\/(\w+)\b\s*([\s\S]*)$/;

/** §4.3 — case-insensitive; searches for a "/word" token anywhere in the text (mention-facet
 *  stripping happens upstream, before this parser ever sees the text — §12.2's job.command). */
export function parseCommand(text: string): ParsedCommand {
  const match = text.match(COMMAND_TOKEN);
  if (!match) return { command: null, args: "" };

  const [, token, rest] = match;
  const lower = token!.toLowerCase();
  const args = (rest ?? "").trim();

  if (!(V1_COMMANDS as readonly string[]).includes(lower)) {
    return { command: null, args };
  }

  return { command: lower as CommandName, args };
}
