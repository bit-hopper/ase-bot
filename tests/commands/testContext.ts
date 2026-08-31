import { constants } from "sweph";
import type pg from "pg";
import type { CommandContext } from "../../src/commands/context.js";

export function buildTestContext(pool: pg.Pool, overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    pool,
    did: "did:plc:test-user",
    handle: "test.bsky.social",
    now: new Date("2026-08-28T12:00:00Z"),
    ephemerisTtlHours: 2,
    calcFlags: constants.SEFLG_MOSEPH | constants.SEFLG_SPEED,
    templates: [],
    ...overrides,
  };
}
