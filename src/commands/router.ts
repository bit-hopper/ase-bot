import type { ReplyThread } from "../output/replyThread.js";
import type { CommandContext } from "./context.js";
import { handleChart } from "./chart.js";
import { handleDivine } from "./divine.js";
import { handleHelp } from "./help.js";
import { handleMoon } from "./moon.js";
import { parseCommand } from "./parser.js";
import { handlePull } from "./pull.js";
import { handleReading } from "./reading.js";
import { handleSet } from "./set.js";
import { handleSign } from "./sign.js";

/** §4.3 — parses `rawText` and dispatches to the matching handler; unrecognized text (no
 *  command token, or a token that isn't one of the 8 v1 commands) replies with /help. */
export async function handleCommand(ctx: CommandContext, rawText: string): Promise<ReplyThread> {
  const { command, args } = parseCommand(rawText);

  switch (command) {
    case "help":
      return handleHelp(args);
    case "set":
      return handleSet(ctx, args);
    case "sign":
      return handleSign(ctx);
    case "pull":
      return handlePull(ctx, args);
    case "reading":
      return handleReading(ctx, args);
    case "divine":
      return handleDivine(ctx);
    case "moon":
      return handleMoon(ctx);
    case "chart":
      return handleChart(ctx);
    case null:
      return handleHelp();
  }
}
