import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("device-quiet-tab-rehydrate wiring", () => {
  it("scan-tab-keys marks boot ready before chrome refresh (cross-tab E2E)", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "site/js/scan-tab-keys.mjs"),
      "utf8"
    );
    expect(src).toContain("markDeviceBootReady");
    expect(src).toContain("markResolverHealthBootSettled");
    const bootIdx = src.indexOf("markDeviceBootReady()");
    const chromeIdx = src.indexOf("refreshDeviceChrome({ immediate: true })");
    expect(bootIdx).toBeGreaterThan(-1);
    expect(chromeIdx).toBeGreaterThan(bootIdx);
  });

  it("scan-tab-keys registers presence before scan quiet rehydrate", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "site/js/scan-tab-keys.mjs"),
      "utf8"
    );
    expect(src).toContain("maybeQuietTabRehydrateForScan");
    expect(src).toContain("await maybeQuietTabRehydrateForScan(");
    const presenceIdx = src.indexOf("startTabKeysPresence()");
    const rehydrateIdx = src.indexOf("await maybeQuietTabRehydrateForScan(");
    expect(presenceIdx).toBeGreaterThan(-1);
    expect(rehydrateIdx).toBeGreaterThan(presenceIdx);
  });

  it("device-status wires quiet rehydrate bootstrap before chrome refresh", () => {
    const statusSrc = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-status.mjs"),
      "utf8"
    );
    const bootstrapSrc = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-quiet-tab-rehydrate-bootstrap.mjs"),
      "utf8"
    );
    expect(statusSrc).toContain("ensureQuietTabRehydrateBootstrap");
    expect(statusSrc).toContain("bootDeviceStatusShell");
    expect(bootstrapSrc).toContain("maybeQuietTabRehydrate");
    expect(bootstrapSrc).toContain("bindQuietTabRehydrateBootstrap");
    expect(statusSrc).toContain("await ensureQuietTabRehydrateBootstrap(");
  });

  it("quiet rehydrate applies Tier 3 cross-tab demotion on success", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-quiet-tab-rehydrate.mjs"),
      "utf8"
    );
    expect(src).toContain("applyQuietRehydrateCrossTabDemotion");
    expect(src).toContain("notifyProfileSavedOnDevice");
    expect(src).toContain("setQuietTabRehydratedProfile");
  });

  it("shell presence filters cross-tab after quiet rehydrate", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-tab-presence.mjs"),
      "utf8"
    );
    expect(src).toContain("getQuietTabRehydratedProfile");
    expect(src).toContain("filterCrossTabEntriesAfterQuietRehydrate");
  });

  it("created.mjs passes urlProfileId so deep links stay view-only (K1b)", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "site/js/created.mjs"),
      "utf8"
    );
    expect(src).toContain("urlProfileId: profileIdParam");
    expect(src).toContain("ensureQuietTabRehydrateBootstrap(");
  });

  it("exports sole-signing-row scan fallback for vouch (P0b-3)", () => {
    const rehydrateSrc = fs.readFileSync(
      path.join(process.cwd(), "site/js/device-quiet-tab-rehydrate.mjs"),
      "utf8"
    );
    const vouchSrc = fs.readFileSync(
      path.join(process.cwd(), "site/js/vouch-issue.mjs"),
      "utf8"
    );
    expect(rehydrateSrc).toContain("trySoleSigningRowRehydrateForScan");
    expect(rehydrateSrc).toContain("maybeQuietTabRehydrateForScan");
    expect(vouchSrc).toContain("trySoleSigningRowRehydrateForScan({");
    expect(rehydrateSrc).toContain("walletEntriesWithSigningKeys(loadWallet())");
    expect(vouchSrc).toContain("trySoleSigningRowRehydrateForScan");
    expect(vouchSrc).toContain("tryAutoActivateSoleSigningWalletForVouch");
    expect(vouchSrc).toContain("soleSigningActivated: true");
    expect(vouchSrc).toContain("soleRowRehydrated: true");
  });
});
