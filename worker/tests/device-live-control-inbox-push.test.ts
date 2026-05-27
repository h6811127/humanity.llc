import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_E2eWakketTest9";
const CHALLENGE = "lc_pushInboxTest01";

const mocks = vi.hoisted(() => ({
  fetchResolverJson: vi.fn(),
  broadcastSnapshot: vi.fn(),
  dispatchEvent: vi.fn(),
  wallet: [
    {
      profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      qr_id: "qr_E2eWakketTest9",
      label: "Push card",
      scan_url:
        "https://humanity.llc/c/7Xk9mP2nQ4rT6vW8yZ1aB3cD5?q=qr_E2eWakketTest9",
    },
    {
      profile_id: "9Yk9mP2nQ4rT6vW8yZ1aB3cD6",
      qr_id: "qr_OtherCardTest9",
      label: "Other card",
      scan_url:
        "https://humanity.llc/c/9Yk9mP2nQ4rT6vW8yZ1aB3cD6?q=qr_OtherCardTest9",
    },
  ],
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
  getTabSession: () => ({ profile_id: PROFILE }),
  activateWalletEntry: vi.fn(),
}));

vi.mock("../../site/js/device-steward-entitlements.mjs", () => ({
  getStewardEntitlementsPolicy: () => ({
    stewardHosted: true,
    notifyPushLiveProof: true,
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
    Authorization: "Bearer session-push-test",
    "X-HC-Device-Id": "device-push-test",
  }),
  STEWARD_ENTITLEMENTS_CHANGED: "hc-steward-entitlements-changed",
  STEWARD_MANUAL_POLL_HEADER: "X-HC-Live-Proof-Manual",
  STEWARD_QUOTA_CHANGED: "hc-steward-quota-changed",
}));

vi.mock("../../site/js/device-steward-push.mjs", () => ({
  initStewardPushClient: vi.fn(),
  stewardPushSuppressesAutoPoll: () => true,
  syncStewardPushConnection: vi.fn(),
  STEWARD_PUSH_LIVE_PROOF_EVENT: "hc-steward-push-live-proof",
  STEWARD_PUSH_STATE_CHANGED: "hc-steward-push-state-changed",
}));

vi.mock("../../site/js/device-live-control-poll-leader.mjs", () => ({
  bindLiveControlPollLeaderSnapshot: vi.fn(),
  broadcastLiveControlPollSnapshot: mocks.broadcastSnapshot,
  claimLiveControlPollLeader: vi.fn(),
  getLiveControlPollTabId: () => "tab-push-test",
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

describe("device live-control inbox push handling", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.fetchResolverJson.mockReset();
    mocks.broadcastSnapshot.mockReset();
    mocks.dispatchEvent.mockReset();
    vi.stubGlobal("window", {
      dispatchEvent: mocks.dispatchEvent,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
      addEventListener: vi.fn(),
    });
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a push hint for one targeted challenge GET and updates inbox state", async () => {
    const expiresAt = new Date(Date.now() + 120_000).toISOString();
    mocks.fetchResolverJson.mockResolvedValueOnce({
      status: 200,
      body: {
        status: "pending",
        challenge_id: CHALLENGE,
        owner_url: `https://humanity.llc/created/?profile_id=${PROFILE}&qr_id=${QR}&live_challenge=${CHALLENGE}`,
        return_url: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
        expires_at: expiresAt,
      },
      notModified: false,
    });
    const inbox = await import("../../site/js/device-live-control-inbox.mjs");

    const pending = await inbox.applyLiveProofPendingFromPush({
      profile_id: PROFILE,
      qr_id: QR,
      challenge_id: CHALLENGE,
      expires_at: expiresAt,
    });

    expect(mocks.fetchResolverJson).toHaveBeenCalledTimes(1);
    expect(mocks.fetchResolverJson.mock.calls[0]?.[0]).toContain(`/cards/${PROFILE}/`);
    expect(mocks.fetchResolverJson.mock.calls[0]?.[0]).toContain(`qr_id=${QR}`);
    const init = mocks.fetchResolverJson.mock.calls[0]?.[1] as { headers: Headers };
    expect(init.headers.get("X-HC-Live-Proof-Manual")).toBeNull();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.challenge_id).toBe(CHALLENGE);
    expect(mocks.broadcastSnapshot).toHaveBeenCalledOnce();
    expect(
      mocks.dispatchEvent.mock.calls.some(
        ([event]) => event.type === "hc-live-control-inbox-changed"
      )
    ).toBe(true);
  });

  it("ignores stale push events without fetching", async () => {
    const inbox = await import("../../site/js/device-live-control-inbox.mjs");

    await inbox.applyLiveProofPendingFromPush({
      profile_id: PROFILE,
      qr_id: QR,
      challenge_id: CHALLENGE,
      expires_at: "2020-01-01T00:00:00.000Z",
    });

    expect(mocks.fetchResolverJson).not.toHaveBeenCalled();
  });
});
