import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCanonicalPrintScanUrl,
  liveControlChallengeResponseIssues,
  liveControlChallengeSmokeFailure,
  resolveLiveControlSmokeIds,
  resolvePrintedQaOperatorUrls,
  resolveScanSmokeUrl,
  scanPageLiveControlHardeningMissing,
  scanPageSmokeFailure,
  smokeProductionLiveControlChallenge,
  smokeProductionScanPage,
  validatePrintScanUrl,
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

  it("resolvePrintedQaOperatorUrls builds scan and created URLs", () => {
    const urls = resolvePrintedQaOperatorUrls("https://humanity.llc");
    expect(urls.scanUrl).toContain("/c/r4YyNEWJvVwWNMETzXfGjFyL");
    expect(urls.createdUrl).toContain("/created/?profile_id=r4YyNEWJvVwWNMETzXfGjFyL");
  });

  it("liveControlChallengeSmokeFailure detects 500 and Error 1101 bodies", () => {
    expect(liveControlChallengeSmokeFailure(201, '{"challenge_id":"lc_x"}')).toBe(false);
    expect(liveControlChallengeSmokeFailure(500, "error code: 1101")).toBe(true);
  });

  it("liveControlChallengeResponseIssues accepts 201 JSON with challenge_id and status_url", () => {
    expect(
      liveControlChallengeResponseIssues(
        201,
        JSON.stringify({ challenge_id: "lc_test", status_url: "https://humanity.llc/status" })
      )
    ).toEqual([]);
    expect(liveControlChallengeResponseIssues(500, "error code: 1101")).toContain(
      "HTTP 500 or Cloudflare 1101 HTML body (H-02)"
    );
    expect(liveControlChallengeResponseIssues(201, "not json")).toContain(
      "challenge POST body is not JSON (H-02)"
    );
  });

  it("scanPageLiveControlHardeningMissing flags absent H-01/H-03 markers", () => {
    const html =
      'parseLiveControlJsonResponse Could not create live proof request. Having trouble checking proof status. Tap to retry. id="live-control-poll-retry"';
    expect(scanPageLiveControlHardeningMissing(html)).toEqual([]);
    expect(scanPageLiveControlHardeningMissing("<html></html>")).toContain(
      "parseLiveControlJsonResponse"
    );
  });

  it("smokeProductionScanPage exits when hardening markers missing", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 200,
        text: async () => "<html>scan page without hardening</html>",
      }))
    );

    await expect(
      smokeProductionScanPage("https://api.test", { verifyHardening: true })
    ).rejects.toThrow("exit:1");

    exit.mockRestore();
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

  it("validatePrintScanUrl and buildCanonicalPrintScanUrl match showcase plate", () => {
    const { profileId, qrId } = resolveLiveControlSmokeIds("https://humanity.llc");
    const scanUrl = resolveScanSmokeUrl("https://humanity.llc");
    const canonical = buildCanonicalPrintScanUrl("https://humanity.llc", profileId, qrId);
    expect(scanUrl).toBe(canonical);
    expect(
      validatePrintScanUrl(scanUrl, {
        profileId,
        qrId,
        expectedOrigin: "https://humanity.llc",
      })
    ).toEqual([]);
  });
});
