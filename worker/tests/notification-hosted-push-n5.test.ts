import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { NOTIFICATION_INVENTORY } from "../../site/js/device-notification-inventory-core.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(relPath: string): string {
  const abs = join(repoRoot, relPath);
  expect(existsSync(abs), `${relPath} must exist`).toBe(true);
  return readFileSync(abs, "utf8");
}

describe("WS-NOTIF N5 hosted push TIF contract", () => {
  it("RFC documents WS-NOTIF integration and forbids parallel notify", () => {
    const rfc = readRepoFile("docs/HOSTED_TIER_PUSH_ARCHITECTURE_RFC.md");
    expect(rfc).toMatch(/WS-NOTIF integration \(N5/);
    expect(rfc).toMatch(/device-notification-delivery/);
    expect(rfc).toMatch(/applyLiveProofPendingFromPush/);
    expect(rfc).toMatch(/Forbidden client patterns/);
  });

  it("NOTIFICATION_SYSTEM_V2 § N5 defines transport → inbox → router pipeline", () => {
    const spec = readRepoFile("docs/NOTIFICATION_SYSTEM_V2.md");
    expect(spec).toMatch(/## N5 — Hosted push and TIF/);
    expect(spec).toMatch(/hc-live-control-inbox-changed/);
    expect(spec).toMatch(/device-notification-delivery/);
  });

  it("steward-push-sse inventory entry maps live_proof U0", () => {
    const entry = NOTIFICATION_INVENTORY.find((e) => e.id === "steward-push-sse");
    expect(entry?.inboxKind).toBe("live_proof");
    expect(entry?.tier).toBe("U0");
    expect(entry?.nPhase).toBe("keep");
    expect(entry?.currentBehavior).toMatch(/applyLiveProofPendingFromPush/);
  });

  it("device-steward-push.mjs is transport-only (no direct Notification API)", () => {
    const push = readRepoFile("site/js/device-steward-push.mjs");
    expect(push).toMatch(/STEWARD_PUSH_LIVE_PROOF_EVENT/);
    expect(push).not.toMatch(/\bnew Notification\b/);
    expect(push).not.toMatch(/\.showNotification\s*\(/);
    expect(push).not.toMatch(/applyOsNotificationsFromInbox/);
  });

  it("push events funnel through live-control inbox then inbox-changed", () => {
    const inbox = readRepoFile("site/js/device-live-control-inbox.mjs");
    expect(inbox).toMatch(/applyLiveProofPendingFromPush/);
    expect(inbox).toMatch(/STEWARD_PUSH_LIVE_PROOF_EVENT/);
    expect(inbox).toMatch(/hc-live-control-inbox-changed/);
    expect(inbox).toMatch(/forwardLiveProofPushToServiceWorker/);
  });

  it("SW caches hosted push hints for OS when tab is not visible", () => {
    const sw = readRepoFile("site/sw-live-proof.mjs");
    expect(sw).toMatch(/cachePushHintInState/);
    expect(sw).toMatch(/flushCachedOsPlans/);
    expect(sw).toMatch(/buildRelayOfferOsPlan/);
    const swCore = readRepoFile("site/js/device-live-control-sw-core.mjs");
    expect(swCore).toMatch(/upsertSwPushHintCache/);
    expect(swCore).toMatch(/upsertCachedOsPlans/);
  });

  it("browser OS path still routes through delivery router after inbox", () => {
    const browser = readRepoFile("site/js/device-browser-notifications.mjs");
    expect(browser).toMatch(/runOsDeliveryFromInbox/);
    const push = readRepoFile("site/js/device-steward-push.mjs");
    expect(push).not.toMatch(/runOsDeliveryFromInbox/);
  });

  it("worker fan-out hook exists on challenge POST path", () => {
    const lc = readRepoFile("worker/src/resolver/live-control.ts");
    expect(lc).toMatch(/notifyLiveProofPending/);
    expect(existsSync(join(repoRoot, "worker/src/steward/push.ts"))).toBe(true);
  });
});
