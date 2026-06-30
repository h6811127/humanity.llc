import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_INVENTORY,
  NOTIFICATION_INVENTORY_IDS,
  notificationInventoryFoldTargets,
  notificationInventoryOsSourceFiles,
} from "../../site/js/device-notification-inventory-core.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(relPath: string): string {
  const abs = join(repoRoot, relPath);
  expect(existsSync(abs), `${relPath} must exist`).toBe(true);
  return readFileSync(abs, "utf8");
}

describe("WS-NOTIF N0 notification inventory", () => {
  it("has unique stable ids", () => {
    const ids = NOTIFICATION_INVENTORY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(NOTIFICATION_INVENTORY_IDS.length).toBe(ids.length);
  });

  it("references existing source files", () => {
    for (const entry of NOTIFICATION_INVENTORY) {
      expect(existsSync(join(repoRoot, entry.file)), entry.id).toBe(true);
    }
  });

  it("N1: relay_offer is in inbox core and gather", () => {
    const core = readRepoFile("site/js/device-inbox-core.mjs");
    expect(core).toMatch(/kind:\s*["']relay_offer["']/);
    expect(core).toMatch(/export function inboxTier/);

    const gather = readRepoFile("site/js/device-inbox.mjs");
    expect(gather).toMatch(/getRelayOfferPendingCount/);
    expect(gather).toMatch(/relayOfferCount/);
  });

  it("N2: OS delivery routes through device-notification-delivery", () => {
    const browserNotif = readRepoFile("site/js/device-browser-notifications.mjs");
    expect(browserNotif).toMatch(/applyOsNotificationsFromInbox/);
    expect(browserNotif).toMatch(/deliverOsNotificationPlansToServiceWorker/);
    expect(browserNotif).toMatch(/flushPushCache/);
    expect(browserNotif).toMatch(/runOsDeliveryFromInbox/);
    expect(browserNotif).toMatch(/probeAndDeliverBackgroundAlerts/);
    expect(browserNotif).toMatch(/probeLiveControlInboxForBackgroundAlerts/);
    expect(browserNotif).toMatch(/syncBackgroundAlertPollTimer/);
    expect(browserNotif).toMatch(/bindLiveProofNotificationNavListener/);
    expect(readRepoFile("site/sw-live-proof.mjs")).toMatch(/pollAllWalletEntriesForLiveProof/);
    expect(readRepoFile("site/sw-live-proof.mjs")).toMatch(/flushCachedPushHints/);
    expect(readRepoFile("site/sw-live-proof.mjs")).toMatch(/flushCachedOsPlans/);
    expect(readRepoFile("site/sw-live-proof.mjs")).toMatch(/relayOfferCount/);
    expect(readRepoFile("site/sw-live-proof.mjs")).toMatch(/cachedPushHints/);
    expect(readRepoFile("site/sw-live-proof.mjs")).toMatch(/postMessage/);
    expect(readRepoFile("site/sw-live-proof.mjs")).not.toMatch(/client\.navigate/);
    expect(existsSync(join(repoRoot, "site/js/device-notification-delivery-core.mjs"))).toBe(
      true
    );

    for (const rel of notificationInventoryOsSourceFiles()) {
      expect(existsSync(join(repoRoot, rel))).toBe(true);
    }
  });

  it("N1: U0 kinds allowed for OS (live_proof + relay_offer)", () => {
    const core = readRepoFile("site/js/device-browser-notifications-core.mjs");
    expect(core).toMatch(/inboxKindAllowsOsNotification/);
    expect(core).toMatch(/kind === "live_proof"/);
    expect(core).toMatch(/kind === "relay_offer"/);
  });

  it("N3: foreground strip module and e2e spec exist", () => {
    expect(existsSync(join(repoRoot, "site/js/device-foreground-attention.mjs"))).toBe(
      true
    );
    expect(existsSync(join(repoRoot, "e2e/notification-foreground.spec.ts"))).toBe(true);
    const fg = readRepoFile("site/js/device-foreground-attention.mjs");
    expect(fg).toMatch(/device-foreground-attention/);
    expect(fg).toMatch(/buildForegroundAttentionStripModel/);
  });

  it("N2: hub-inbox-alerts reads pending rows from inbox meta via delivery-core", () => {
    const alerts = readRepoFile("site/js/device-hub-inbox-alerts.mjs");
    expect(alerts).toMatch(/relayOfferPendingFromInbox/);
    expect(alerts).toMatch(/liveProofPendingFromInbox/);
    expect(alerts).not.toMatch(/getRelayOfferPending/);
  });

  it("post-N1: relay_offer fold targets are shipped in inventory", () => {
    const relayPoll = NOTIFICATION_INVENTORY.find((e) => e.id === "relay-offer-poll");
    expect(relayPoll?.nPhase).toBe("shipped");
    expect(relayPoll?.inboxKind).toBe("relay_offer");
    expect(notificationInventoryFoldTargets().length).toBe(0);
  });
});
