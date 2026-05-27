import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchResolverJson: vi.fn(),
  wallet: [
    {
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      qr_id: "qr_E2eWakketTest9",
      label: "Quota card",
      scan_url:
        "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eWakketTest9",
    },
  ],
  dispatchEvent: vi.fn(),
}));

vi.mock("../../site/js/device-hub-network-tools-core.mjs", async () => {
  const actual = await vi.importActual<
    typeof import("../../site/js/device-hub-network-tools-core.mjs")
  >("../../site/js/device-hub-network-tools-core.mjs");
  return {
    ...actual,
    isWatchLiveProofEnabled: () => true,
  };
});

vi.mock("../../site/js/device-keys.mjs", () => ({
  getTabSession: () => ({ profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5" }),
  activateWalletEntry: vi.fn(),
}));

vi.mock("../../site/js/device-steward-entitlements.mjs", () => ({
  getStewardEntitlementsPolicy: () => ({
    stewardHosted: true,
    notifyPushLiveProof: false,
    pollLiveProofAutoDailyCap: 4000,
    pollLiveProofIdleMs: 30_000,
    pollLiveProofActiveMs: 5_000,
    pollNetworkMaxParallel: 5,
    pollNetworkManualMaxParallel: 3,
    walletLargeThreshold: 25,
    swPeriodicMinMs: 300_000,
    planId: "hosted_steward_v1",
    status: "active",
  }),
  stewardResolverRequestHeaders: () => ({
    Authorization: "Bearer test-steward-session",
    "X-HC-Device-Id": "device-quota-test",
  }),
  STEWARD_ENTITLEMENTS_CHANGED: "hc-steward-entitlements-changed",
  STEWARD_MANUAL_POLL_HEADER: "X-HC-Live-Proof-Manual",
  STEWARD_QUOTA_CHANGED: "hc-steward-quota-changed",
}));

vi.mock("../../site/js/device-steward-push.mjs", () => ({
  initStewardPushClient: vi.fn(),
  stewardPushSuppressesAutoPoll: () => false,
  syncStewardPushConnection: vi.fn(),
  STEWARD_PUSH_LIVE_PROOF_EVENT: "hc-steward-push-live-proof",
  STEWARD_PUSH_STATE_CHANGED: "hc-steward-push-state-changed",
}));

vi.mock("../../site/js/device-live-control-poll-leader.mjs", () => ({
  bindLiveControlPollLeaderSnapshot: vi.fn(),
  broadcastLiveControlPollSnapshot: vi.fn(),
  claimLiveControlPollLeader: vi.fn(),
  getLiveControlPollTabId: () => "tab-quota-test",
  isLiveControlPollLeaderTab: () => true,
  touchLiveControlPollLeader: vi.fn(),
}));

vi.mock("../../site/js/device-wallet-since-visit-gate.mjs", () => ({
  getResolverHealthStatus: () => "ok",
}));

vi.mock("../../site/js/device-browser-notifications-sw.mjs", () => ({
  syncLiveProofServiceWorkerState: vi.fn(),
}));

vi.mock("../../site/js/hc-sign.mjs", () => ({
  getPendingLiveControlChallengeUrl: (profileId: string, qrId: string) =>
    `https://humanity.llc/.well-known/hc/v1/cards/${profileId}/live-control/challenges?qr_id=${qrId}`,
}));

vi.mock("../../site/js/resolver-conditional-fetch-core.mjs", () => ({
  fetchResolverJson: mocks.fetchResolverJson,
}));

vi.mock("../../site/js/device-wallet.mjs", () => ({
  loadWallet: () => mocks.wallet,
  walletEntryQrId: (entry: Record<string, unknown>) =>
    typeof entry.qr_id === "string" ? entry.qr_id : null,
}));

function storageFor() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  };
}

describe("device live-control inbox steward quota handling", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.fetchResolverJson.mockReset();
    mocks.dispatchEvent.mockReset();
    vi.stubGlobal("localStorage", storageFor());
    vi.stubGlobal("window", {
      dispatchEvent: mocks.dispatchEvent,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
      addEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pauses auto polling and surfaces operator quota copy on steward 429", async () => {
    mocks.fetchResolverJson.mockResolvedValueOnce({
      status: 429,
      body: {
        error: "steward_quota_exceeded",
        usage: { "poll.live_proof.auto": 4000, limit: 4000 },
      },
      notModified: false,
    });
    const inbox = await import("../../site/js/device-live-control-inbox.mjs");
    const budget = await import(
      "../../site/js/device-live-control-poll-budget-core.mjs"
    );
    const { formatHubNetworkStatusLine } = await import(
      "../../site/js/device-hub-network-tools-core.mjs"
    );

    await inbox.refreshLiveControlInbox();

    expect(inbox.isStewardServerQuotaPaused()).toBe(true);
    expect(
      budget.isLiveControlAutoPollBudgetExhausted(
        localStorage.getItem(budget.LIVE_CONTROL_AUTO_POLL_STORAGE_KEY),
        Date.now(),
        4000
      )
    ).toBe(true);
    expect(
      mocks.dispatchEvent.mock.calls.some(
        ([event]) => event.type === "hc-steward-quota-changed"
      )
    ).toBe(true);
    expect(
      formatHubNetworkStatusLine({
        stewardQuotaPaused: inbox.isStewardServerQuotaPaused(),
        liveProofWatchOn: true,
      })
    ).toContain("Operator daily");
  });

  it("allows manual checks after an automatic steward quota pause", async () => {
    mocks.fetchResolverJson
      .mockResolvedValueOnce({
        status: 429,
        body: {
          error: "steward_quota_exceeded",
          usage: { "poll.live_proof.auto": 4000, limit: 4000 },
        },
        notModified: false,
      })
      .mockResolvedValueOnce({ status: 404, body: {}, notModified: false });
    const inbox = await import("../../site/js/device-live-control-inbox.mjs");

    await inbox.refreshLiveControlInbox();
    await inbox.refreshLiveControlInbox({ manual: true });

    expect(mocks.fetchResolverJson).toHaveBeenCalledTimes(2);
    const manualInit = mocks.fetchResolverJson.mock.calls[1]?.[1] as {
      headers: Headers;
    };
    expect(manualInit.headers.get("X-HC-Live-Proof-Manual")).toBe("1");
  });
});
