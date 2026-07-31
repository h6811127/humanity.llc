import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(relPath: string): string {
  const abs = join(repoRoot, relPath);
  expect(existsSync(abs), `${relPath} must exist`).toBe(true);
  return readFileSync(abs, "utf8");
}

describe("WS-NOTIF Tier 1 background OS transport contract", () => {
  it("T1-1: hidden tab does not use page Notification API", () => {
    const delivery = readRepoFile("site/js/device-notification-delivery.mjs");
    expect(delivery).toMatch(/Hidden tab: SW-only OS/);
    expect(delivery).not.toMatch(/\bnew Notification\b/);
  });

  it("T1-2: page forwards OS plans to SW (live proof + relay)", () => {
    const browser = readRepoFile("site/js/device-browser-notifications.mjs");
    expect(browser).toMatch(/deliverOsNotificationPlansToServiceWorker/);
    expect(browser).toMatch(/probeRelayOfferInboxForBackgroundAlerts/);
    expect(browser).toMatch(/flushPushCache:\s*true/);
    expect(browser).toMatch(/notifyTransportFieldSnapshot/);
    expect(browser).toMatch(/__hcNotifyTransportSnapshot/);
  });

  it("T1-2b: background probe has a module-scope single-flight guard", () => {
    const browser = readRepoFile("site/js/device-browser-notifications.mjs");
    expect(browser).toMatch(/let\s+backgroundProbeInFlight\s*=\s*false/);
    expect(browser).toMatch(/if\s*\(\s*backgroundProbeInFlight\s*\)\s*return/);
  });

  it("T1-3: SW full-wallet probe on pollNow only", () => {
    const sw = readRepoFile("site/sw-live-proof.mjs");
    expect(sw).toMatch(/pollAllWalletEntriesForLiveProof/);
    expect(sw).toMatch(/fullWallet:\s*true/);
    expect(sw).toMatch(/pollWalletEntriesForLiveProof/);
  });

  it("T1-4: hosted push hints cache in SW and flush when tab away", () => {
    const sw = readRepoFile("site/sw-live-proof.mjs");
    expect(sw).toMatch(/cachePushHintInState/);
    expect(sw).toMatch(/flushDeferredOsNotifications/);
    expect(sw).toMatch(/flushCachedOsPlans/);
    const swCore = readRepoFile("site/js/device-live-control-sw-core.mjs");
    expect(swCore).toMatch(/upsertSwPushHintCache/);
    expect(swCore).toMatch(/upsertCachedOsPlans/);
    expect(readRepoFile("site/js/device-notification-delivery-core.mjs")).toMatch(
      /buildRelayOfferOsPlan/
    );
  });

  it("T1-5: relay OS plan + inbox open tap-through in SW", () => {
    const sw = readRepoFile("site/sw-live-proof.mjs");
    expect(sw).toMatch(/buildRelayOfferOsPlan/);
    expect(sw).toMatch(/HC_SW_OPEN_INBOX/);
    const nav = readRepoFile("site/js/device-live-proof-notification-nav.mjs");
    expect(nav).toMatch(/HC_SW_OPEN_INBOX/);
    expect(nav).toMatch(/openInboxFromChrome/);
  });

  it("P0-N2 field matrix documents Tier 1 transport path", () => {
    const qa = readRepoFile("docs/DEVICE_OS_QA.md");
    expect(qa).toMatch(/P0-N2/);
    expect(qa).toMatch(/SW-only|service worker|sw-live-proof/i);
    expect(qa).toMatch(/notify:transport:tier1/);
  });
});
