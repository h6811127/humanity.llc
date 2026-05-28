import { describe, expect, it, vi, afterEach } from "vitest";

import {
  smokeStewardOpsAuthGate,
  verifyStewardOpsReachable,
} from "../scripts/hosted-rollout-step3a.mjs";

describe("hosted-rollout-step3a smoke", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("smokeStewardOpsAuthGate accepts 401 when secret is configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 401,
        text: async () =>
          JSON.stringify({
            error: "UNAUTHORIZED",
            message: "Valid Bearer OPERATOR_AUDIT_TOKEN required.",
          }),
      }))
    );

    await expect(smokeStewardOpsAuthGate("https://api.test")).resolves.toBe("configured");
  });

  it("smokeStewardOpsAuthGate accepts 503 when secret is not on worker yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 503,
        text: async () =>
          JSON.stringify({
            error: "OPERATOR_AUDIT_UNCONFIGURED",
            message: "Operator audit token is not configured on this resolver.",
          }),
      }))
    );

    await expect(smokeStewardOpsAuthGate("https://api.test")).resolves.toBe("unconfigured");
  });

  it("verifyStewardOpsReachable exits when schema is missing", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            hosted_steward_enabled: false,
            schema: "missing",
          }),
      }))
    );

    await expect(
      verifyStewardOpsReachable("test-token-ascii", "https://api.test")
    ).rejects.toThrow("exit:1");

    exit.mockRestore();
  });
});
