import { afterEach, describe, expect, it, vi } from "vitest";

import {
  smokeHostedPlansEnabled,
  smokeHostedStewardRoutesEnabled,
  smokeProductionHealth,
  smokeStewardOpsHostedEnabled,
} from "../scripts/hosted-rollout-step4.mjs";

describe("hosted-rollout-step4 smoke", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("smokeProductionHealth rejects schema_missing", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ status: "ok", database: "schema_missing" }),
      }))
    );

    await expect(smokeProductionHealth("https://api.test")).rejects.toThrow("exit:1");

    exit.mockRestore();
  });

  it("smokeHostedPlansEnabled rejects hosted_steward_disabled", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            error: "hosted_steward_disabled",
            message: "Hosted steward extension is not enabled on this operator.",
          }),
      }))
    );

    await expect(smokeHostedPlansEnabled("https://api.test")).rejects.toThrow("exit:1");

    exit.mockRestore();
  });

  it("smokeHostedPlansEnabled accepts hosted_steward_v1 plan", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            plans: [{ plan_id: "hosted_steward_v1", plan_version: 1 }],
          }),
      }))
    );

    await expect(smokeHostedPlansEnabled("https://api.test")).resolves.toBeUndefined();
  });

  it("smokeHostedStewardRoutesEnabled requires capabilities extension enabled", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/operator/capabilities")) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ extensions: {} }),
          };
        }
        return {
          ok: false,
          status: 404,
          text: async () => JSON.stringify({ error: "hosted_steward_disabled" }),
        };
      })
    );

    await expect(smokeHostedStewardRoutesEnabled("https://api.test")).rejects.toThrow(
      "exit:1"
    );

    exit.mockRestore();
  });

  it("smokeStewardOpsHostedEnabled requires hosted_steward_enabled true", async () => {
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
          }),
      }))
    );

    await expect(
      smokeStewardOpsHostedEnabled("test-token-ascii", "https://api.test")
    ).rejects.toThrow("exit:1");

    exit.mockRestore();
  });
});
