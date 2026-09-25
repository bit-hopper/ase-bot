import { PLANETS, type Planet } from "../data/types.js";

export const CHECK_USAGE = `Try: /check [${PLANETS.join("/")}]`;

export type ParsedCheckArgs = { planet: Planet } | { error: string };

/** §4.3 — a single positional token naming one of the 10 tracked planets, case-insensitive.
 *  Missing/unrecognized bodies get the command's usage string, per §4.3's "invalid arguments"
 *  rule. */
export function parseCheckArgs(args: string): ParsedCheckArgs {
  const token = args.trim().toLowerCase();
  if ((PLANETS as readonly string[]).includes(token)) {
    return { planet: token as Planet };
  }
  return { error: CHECK_USAGE };
}
