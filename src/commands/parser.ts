/** §4.1 — the v1 commands. v2 commands (/compat, /transit, /weekly, ...) are
 *  intentionally absent. `divine` is the renamed original /reading engine —
 *  `reading` now means the new Sun/Moon/Rising Big Three command.
 *  `/daily` was dropped: it shared /reading's exact pipeline and, in practice, its output too
 *  (the only difference — a 00:00 UTC ephemeris pin vs. live "now" — almost never showed up,
 *  since the Moon rarely crosses a sign boundary within the same UTC day). */
export const V1_COMMANDS = ["help", "set", "sign", "pull", "reading", "divine", "moon", "chart", "check"] as const;
export type CommandName = (typeof V1_COMMANDS)[number];

export interface ParsedCommand {
  /** null when no recognized command token is present (§4.3: reply with help summary). */
  command: CommandName | null;
  /** Everything after the command token, trimmed. */
  args: string;
}

/** Any run of leading @mentions (with optional trailing comma/colon), e.g. "@ase.tinylil.world, " or
 *  "@alice.bsky.social @ase.tinylil.world ". Bluesky puts the mention text in the post body, so it
 *  has to be skipped to reach the command word. */
const LEADING_MENTIONS = /^(?:\s*@[\w.-]+[,:]?)*\s*/;
const WRAPPING_QUOTES = /^["'“”‘’]+|["'“”‘’]+$/g;
const COMMAND_TOKEN = /^(\w+)\s*([\s\S]*)$/;

/** §4.3 — case-insensitive; the command is the FIRST word of the post after any leading @mentions
 *  (no slash — "@ase pull", not "@ase /pull"). Anything later in the text is ignored as a command
 *  candidate, so ordinary chat that happens to contain "pull" or "moon" never fires one. A
 *  slash-prefixed "/pull" no longer parses and falls through to the /help reply. (Mention-facet
 *  detection happens upstream — §11.2; this only skips the mention *text* to reach the command.) */
export function parseCommand(text: string): ParsedCommand {
  // Forgive a command pasted with its quotes still on ('@ase pull'), as examples are often quoted.
  const unquoted = text.trim().replace(WRAPPING_QUOTES, "");
  const body = unquoted.replace(LEADING_MENTIONS, "");
  const match = body.match(COMMAND_TOKEN);
  if (!match) return { command: null, args: body.trim() };

  const [, token, rest] = match;
  const lower = token!.toLowerCase();
  const args = (rest ?? "").trim();

  if (!(V1_COMMANDS as readonly string[]).includes(lower)) {
    return { command: null, args };
  }

  return { command: lower as CommandName, args };
}
