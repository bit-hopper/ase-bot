import { describe, expect, it } from "vitest";
import { parseCommand } from "../../src/commands/parser.js";

describe("parseCommand (§4.3 — first word, no slash)", () => {
  it("parses a bare command", () => {
    expect(parseCommand("reading")).toEqual({ command: "reading", args: "" });
  });

  it("is case-insensitive", () => {
    expect(parseCommand("Reading").command).toBe("reading");
    expect(parseCommand("PULL").command).toBe("pull");
  });

  it("recognizes divine (the renamed original reading engine)", () => {
    expect(parseCommand("divine").command).toBe("divine");
  });

  it("recognizes check with a planet argument", () => {
    expect(parseCommand("check venus")).toEqual({ command: "check", args: "venus" });
  });

  it("captures everything after the command as args", () => {
    expect(parseCommand("set Sun Leo")).toEqual({ command: "set", args: "Sun Leo" });
  });

  it("skips a leading @mention to reach the command", () => {
    expect(parseCommand("@ase.tinylil.world pull")).toEqual({ command: "pull", args: "" });
    expect(parseCommand("@ase.tinylil.world, moon")).toEqual({ command: "moon", args: "" });
    expect(parseCommand("@ase.tinylil.world check retrograde")).toEqual({ command: "check", args: "retrograde" });
  });

  it("skips several leading @mentions (e.g. a thread reply that tags another user first)", () => {
    expect(parseCommand("@alice.bsky.social @ase.tinylil.world reading sun leo")).toEqual({
      command: "reading",
      args: "sun leo",
    });
  });

  it("forgives a command pasted with its surrounding quotes still on", () => {
    expect(parseCommand("'@ase.tinylil.world pull'")).toEqual({ command: "pull", args: "" });
    expect(parseCommand("“@ase.tinylil.world check venus”")).toEqual({ command: "check", args: "venus" });
  });

  it("tolerates leading whitespace", () => {
    expect(parseCommand("  \n @ase.tinylil.world   chart").command).toBe("chart");
  });

  it("only treats the FIRST word as the command — a command word later in chatter is ignored", () => {
    expect(parseCommand("hey @ase.tinylil.world reading please").command).toBeNull();
    expect(parseCommand("@ase.tinylil.world what is the moon doing").command).toBeNull();
    expect(parseCommand("@ase.tinylil.world please pull a card").command).toBeNull();
  });

  it("no longer accepts the old slash form", () => {
    expect(parseCommand("/reading").command).toBeNull();
    expect(parseCommand("@ase.tinylil.world /pull").command).toBeNull();
  });

  it("returns null command for unrecognized commands", () => {
    expect(parseCommand("bogus").command).toBeNull();
  });

  it("returns null command for v2 commands not implemented in v1", () => {
    expect(parseCommand("compat @someone").command).toBeNull();
    expect(parseCommand("weekly").command).toBeNull();
  });

  it("returns null command for empty text or a bare mention", () => {
    expect(parseCommand("")).toEqual({ command: null, args: "" });
    expect(parseCommand("@ase.tinylil.world")).toEqual({ command: null, args: "" });
  });

  it("treats 'pull 3' as command=pull with args='3' (handler's job to reject it)", () => {
    expect(parseCommand("pull 3")).toEqual({ command: "pull", args: "3" });
  });
});
