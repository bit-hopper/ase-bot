import { PLANETS, type Planet } from "../data/types.js";

export const CHECK_USAGE = `Try: /check [${PLANETS.join("/")}], /check all, or /check retrograde`;

export type ParsedCheckArgs =
  | { mode: "single"; planet: Planet }
  | { mode: "all" }
  | { mode: "retrograde" }
  | { error: string };

/** §4.3 — a single positional token: one of the 10 tracked planets, or the "all"/"retrograde"
 *  subcommands, case-insensitive. Missing/unrecognized bodies get the command's usage string,
 *  per §4.3's "invalid arguments" rule. */
export function parseCheckArgs(args: string): ParsedCheckArgs {
  const token = args.trim().toLowerCase();
  if (token === "all") return { mode: "all" };
  if (token === "retrograde") return { mode: "retrograde" };
  if ((PLANETS as readonly string[]).includes(token)) {
    return { mode: "single", planet: token as Planet };
  }
  return { error: CHECK_USAGE };
}
