import { describe, expect, it } from "vitest";

import type { Env } from "../src/env";
import {
  ACCOUNT_ID_REGEX,
  DEVICE_ID_REGEX,
  STEWARD_LINK_MAX_CLOCK_SKEW_MS,
  STEWARD_LINK_MAX_TTL_MS,
  STEWARD_SESSION_TTL_MS,
  hostedStewardEnabled,
} from "../src/steward/config";

function env(value?: string): Env {
  return { HOSTED_STEWARD_ENABLED: value } as Env;
}

describe("hostedStewardEnabled", () => {
  it("is on only for explicit 1 or true", () => {
    expect(hostedStewardEnabled(env("1"))).toBe(true);
    expect(hostedStewardEnabled(env("true"))).toBe(true);
  });

  it("stays off for unset, false, or other values", () => {
    expect(hostedStewardEnabled(env())).toBe(false);
    expect(hostedStewardEnabled(env("0"))).toBe(false);
    expect(hostedStewardEnabled(env("false"))).toBe(false);
    expect(hostedStewardEnabled(env("TRUE"))).toBe(false);
    expect(hostedStewardEnabled(env("yes"))).toBe(false);
  });
});

describe("steward account and device id regexes", () => {
  it("accepts acc_ plus Base58 without 0 O I l", () => {
    expect(ACCOUNT_ID_REGEX.test("acc_7Xk9mP2nQ4rT")).toBe(true);
    expect(ACCOUNT_ID_REGEX.test("acc_abcdefghijkmnp")).toBe(true);
  });

  it("rejects missing prefix, short ids, and ambiguous Base58 glyphs", () => {
    expect(ACCOUNT_ID_REGEX.test("7Xk9mP2nQ4rT")).toBe(false);
    expect(ACCOUNT_ID_REGEX.test("acc_short")).toBe(false);
    expect(ACCOUNT_ID_REGEX.test("acc_0OIlAmbiguous")).toBe(false);
    expect(ACCOUNT_ID_REGEX.test("acc_has space12")).toBe(false);
  });

  it("accepts device ids with Base58 plus underscore and hyphen", () => {
    expect(DEVICE_ID_REGEX.test("dev_7Xk9mP2nQ4rT")).toBe(true);
    expect(DEVICE_ID_REGEX.test("device-id_abc12345")).toBe(true);
  });

  it("rejects UUID-shaped and too-short device ids", () => {
    expect(DEVICE_ID_REGEX.test("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    expect(DEVICE_ID_REGEX.test("short")).toBe(false);
    expect(DEVICE_ID_REGEX.test("device.id.dots")).toBe(false);
  });
});

describe("steward timing constants", () => {
  it("keeps session, link, and skew windows in the expected range", () => {
    expect(STEWARD_SESSION_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(STEWARD_LINK_MAX_TTL_MS).toBe(15 * 60 * 1000);
    expect(STEWARD_LINK_MAX_CLOCK_SKEW_MS).toBe(60 * 1000);
    expect(STEWARD_LINK_MAX_TTL_MS).toBeLessThan(STEWARD_SESSION_TTL_MS);
    expect(STEWARD_LINK_MAX_CLOCK_SKEW_MS).toBeLessThan(STEWARD_LINK_MAX_TTL_MS);
  });
});
