import { describe, expect, it } from "vitest";
import { parseCommand } from "../../src/commands/parser.js";

describe("parseCommand (§4.3)", () => {
  it("parses a bare command", () => {
    expect(parseCommand("/reading")).toEqual({ command: "reading", args: "" });
  });

  it("is case-insensitive", () => {
    expect(parseCommand("/Reading").command).toBe("reading");
    expect(parseCommand("/PULL").command).toBe("pull");
  });

  it("recognizes /divine (the renamed original /reading engine)", () => {
    expect(parseCommand("/divine").command).toBe("divine");
  });

  it("captures everything after the command as args", () => {
    expect(parseCommand("/set Sun Leo")).toEqual({ command: "set", args: "Sun Leo" });
  });

  it("finds the command token even with leading chatter", () => {
    expect(parseCommand("hey @asebot /reading please").command).toBe("reading");
  });

  it("returns null command for unrecognized commands", () => {
    expect(parseCommand("/bogus").command).toBeNull();
  });

  it("returns null command for v2 commands not implemented in v1", () => {
    expect(parseCommand("/compat @someone").command).toBeNull();
    expect(parseCommand("/weekly").command).toBeNull();
  });

  it("returns null command for text with no command token at all", () => {
    expect(parseCommand("hello Asé what's my sign")).toEqual({ command: null, args: "" });
  });

  it("treats /pull 3 as command=pull with args='3' (handler's job to reject it)", () => {
    expect(parseCommand("/pull 3")).toEqual({ command: "pull", args: "3" });
  });
});
