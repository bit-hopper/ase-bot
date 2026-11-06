import { describe, expect, it } from "vitest";
import { AUTH_FAILURE_COOLDOWN_MS, authFailureCooldownMs } from "../../src/atproto/authFailureBackoff.js";

describe("authFailureCooldownMs", () => {
  it("waits the full cooldown after a rejected login (401 / AuthenticationRequired)", () => {
    expect(authFailureCooldownMs({ status: 401, error: "AuthenticationRequired" })).toBe(AUTH_FAILURE_COOLDOWN_MS);
    expect(authFailureCooldownMs({ error: "AuthenticationRequired" })).toBe(AUTH_FAILURE_COOLDOWN_MS);
  });

  it("keeps attempts under Bluesky's 10/day login limit", () => {
    expect((24 * 60 * 60 * 1000) / AUTH_FAILURE_COOLDOWN_MS).toBeLessThan(10);
  });

  it("on a 429, waits until the server's RateLimit-Reset time", () => {
    const now = Date.UTC(2026, 10, 6, 1, 0, 0);
    const resetEpoch = Math.floor(now / 1000) + 8 * 60 * 60; // 8h out
    const wait = authFailureCooldownMs({ status: 429, headers: { "ratelimit-reset": String(resetEpoch) } }, now)!;
    expect(wait).toBeGreaterThanOrEqual(8 * 60 * 60 * 1000);
    expect(wait).toBeLessThan(8 * 60 * 60 * 1000 + 60_000);
  });

  it("on a 429 with no usable reset header, falls back to the standard cooldown", () => {
    expect(authFailureCooldownMs({ status: 429 })).toBe(AUTH_FAILURE_COOLDOWN_MS);
    expect(authFailureCooldownMs({ status: 429, headers: { "ratelimit-reset": "nope" } })).toBe(AUTH_FAILURE_COOLDOWN_MS);
  });

  it("never waits more than 24h, even for a far-future reset", () => {
    const now = Date.now();
    const wait = authFailureCooldownMs({ status: 429, headers: { "ratelimit-reset": String(Math.floor(now / 1000) + 10 * 86400) } }, now)!;
    expect(wait).toBe(24 * 60 * 60 * 1000);
  });

  it("returns null for non-auth failures so they still fail fast and restart", () => {
    expect(authFailureCooldownMs(new Error("ECONNREFUSED"))).toBeNull();
    expect(authFailureCooldownMs({ status: 500 })).toBeNull();
    expect(authFailureCooldownMs(null)).toBeNull();
    expect(authFailureCooldownMs("boom")).toBeNull();
  });
});
