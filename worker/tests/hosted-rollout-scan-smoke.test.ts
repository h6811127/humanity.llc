import { afterEach, describe, expect, it, vi } from "vitest";

import {
  liveControlChallengeSmokeFailure,
  resolveLiveControlSmokeIds,
  resolveScanSmokeUrl,
  scanPageSmokeFailure,
  smokeProductionLiveControlChallenge,
  smokeProductionScanPage,
} from "../scripts/hosted-rollout-scan-smoke.mjs";

describe("hosted-rollout-scan-smoke", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ROLLOUT_SCAN_SMOKE_URL;
  });

  it("resolveScanSmokeUrl uses showcase status plate by default", () => {
    const url = resolveScanSmokeUrl("https://humanity.llc");
    expect(url).toBe(
      "https://humanity.llc/c/r4YyNEWJvVwWNMETzXfGjFyL?q=qr_8w7zHCPHisXvTnar"
    );
  });

  it("resolveScanSmokeUrl honors ROLLOUT_SCAN_SMOKE_URL", () => {
    process.env.ROLLOUT_SCAN_SMOKE_URL = "https://api.test/c/p?q=qr_test";
    expect(resolveScanSmokeUrl("https://humanity.llc")).toBe("https://api.test/c/p?q=qr_test");
  });

  it("scanPageSmokeFailure detects 500 and Error 1101 bodies", () => {
    expect(scanPageSmokeFailure(200, "<html>ok</html>")).toBe(false);
    expect(scanPageSmokeFailure(404, "not found")).toBe(false);
    expect(scanPageSmokeFailure(500, "error")).toBe(true);
    expect(scanPageSmokeFailure(200, "Error 1101 Worker threw exception")).toBe(true);
  });

  it("smokeProductionScanPage exits on scan failure", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 500,
        text: async () => "error code: 1101",
      }))
    );

    await expect(smokeProductionScanPage("https://api.test")).rejects.toThrow("exit:1");

    exit.mockRestore();
  });

  it("resolveLiveControlSmokeIds reads showcase status plate", () => {
    const { profileId, qrId } = resolveLiveControlSmokeIds("https://humanity.llc");
    expect(profileId).toBe("r4YyNEWJvVwWNMETzXfGjFyL");
    expect(qrId).toBe("qr_8w7zHCPHisXvTnar");
  });

  it("liveControlChallengeSmokeFailure detects 500 and Error 1101 bodies", () => {
    expect(liveControlChallengeSmokeFailure(201, '{"challenge_id":"lc_x"}')).toBe(false);
    expect(liveControlChallengeSmokeFailure(500, "error code: 1101")).toBe(true);
  });

  it("smokeProductionLiveControlChallenge exits on POST failure", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 500,
        text: async () => "error code: 1101",
      }))
    );

    await expect(smokeProductionLiveControlChallenge("https://api.test")).rejects.toThrow("exit:1");

    exit.mockRestore();
  });
});
