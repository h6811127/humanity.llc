import { describe, expect, it } from "vitest";

import {
  anyClientVisible,
  buildLiveProofSwNotification,
  liveProofPollTargetsFromWallet,
  pendingLiveControlChallengeUrl,
  pollWalletEntriesForLiveProof,
  shouldShowSwLiveProofNotification,
  swLiveProofPollingShouldRun,
  SW_PERIODIC_MIN_INTERVAL_MS,
} from "../../site/js/device-live-control-sw-core.mjs";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_ID = "qr_xBZTq7M27tueCzBY";
const QR_ID_B = "qr_E2eWakketTest8";

describe("pendingLiveControlChallengeUrl", () => {
  it("builds resolver challenge URL with qr_id", () => {
    const url = pendingLiveControlChallengeUrl(
      "http://127.0.0.1:8787",
      PROFILE,
      QR_ID
    );
    expect(url).toContain("/live-control/challenges");
    expect(url).toContain(encodeURIComponent(PROFILE));
    expect(url).toContain(`qr_id=${encodeURIComponent(QR_ID)}`);
  });
});

describe("swLiveProofPollingShouldRun", () => {
  it("requires alerts enabled and resolver ok", () => {
    expect(
      swLiveProofPollingShouldRun({ enabled: true, resolverHealth: "ok" })
    ).toBe(true);
    expect(
      swLiveProofPollingShouldRun({ enabled: false, resolverHealth: "ok" })
    ).toBe(false);
    expect(
      swLiveProofPollingShouldRun({ enabled: true, resolverHealth: "degraded" })
    ).toBe(false);
  });
});

describe("SW_PERIODIC_MIN_INTERVAL_MS", () => {
  it("uses at least 15 minutes for periodic background polls", () => {
    expect(SW_PERIODIC_MIN_INTERVAL_MS).toBeGreaterThanOrEqual(15 * 60 * 1000);
  });
});

describe("pollWalletEntriesForLiveProof", () => {
  it("collects pending challenges from fetch results", async () => {
    const entry = {
      profile_id: PROFILE,
      qr_id: QR_ID,
      label: "Demo card",
    };
    const { pending, signature } = await pollWalletEntriesForLiveProof(
      [entry],
      "http://127.0.0.1:8787",
      async () => ({
        ok: true,
        status: 200,
        body: {
          status: "pending",
          challenge_id: "ch_sw_1",
          expires_at: new Date(Date.now() + 120_000).toISOString(),
        },
      })
    );
    expect(pending).toHaveLength(1);
    expect(pending[0]?.challenge_id).toBe("ch_sw_1");
    expect(signature).toContain("ch_sw_1");
  });

  it("skips unreachable polls", async () => {
    const { pending } = await pollWalletEntriesForLiveProof(
      [{ profile_id: PROFILE, qr_id: QR_ID }],
      "http://127.0.0.1:8787",
      async () => ({ ok: false, status: 503, body: null })
    );
    expect(pending).toHaveLength(0);
  });

  it("round-robins one GET per poll call", async () => {
    const entries = [
      { profile_id: PROFILE, qr_id: QR_ID, label: "A" },
      { profile_id: `${PROFILE}2`, qr_id: QR_ID_B, label: "B" },
    ];
    const fetched = [];
    let cursor = 0;
    let slots = {};
    for (let i = 0; i < 2; i += 1) {
      const result = await pollWalletEntriesForLiveProof(
        entries,
        "http://127.0.0.1:8787",
        async (url) => {
          fetched.push(url);
          return {
            ok: true,
            status: 200,
            body: { status: "none" },
          };
        },
        cursor,
        slots
      );
      cursor = result.nextCursor;
      slots = result.pollSlots;
    }
    expect(fetched).toHaveLength(2);
    expect(fetched[0]).not.toBe(fetched[1]);
  });
});

describe("liveProofPollTargetsFromWallet", () => {
  it("keeps pollable rows only", () => {
    const targets = liveProofPollTargetsFromWallet([
      { profile_id: PROFILE, qr_id: QR_ID, label: "A" },
      { profile_id: "x", label: "no qr" },
    ]);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.profile_id).toBe(PROFILE);
  });
});

describe("shouldShowSwLiveProofNotification", () => {
  it("dedupes on signature", () => {
    expect(shouldShowSwLiveProofNotification("a", "a", 1)).toBe(false);
    expect(shouldShowSwLiveProofNotification("a", "b", 1)).toBe(true);
    expect(shouldShowSwLiveProofNotification("a", "b", 0)).toBe(false);
  });
});

describe("anyClientVisible", () => {
  it("detects visible window clients", () => {
    expect(
      anyClientVisible([
        { visibilityState: "hidden" },
        { visibilityState: "visible" },
      ])
    ).toBe(true);
    expect(anyClientVisible([{ visibilityState: "hidden" }])).toBe(false);
  });
});

describe("buildLiveProofSwNotification", () => {
  it("uses live proof copy and sign deep link", () => {
    const payload = buildLiveProofSwNotification(
      {
        entry: { profile_id: PROFILE, qr_id: QR_ID, label: "Field kit" },
        challenge_id: "ch1",
        return_url: null,
        owner_url: null,
        expires_at: "",
      },
      "http://localhost:8788"
    );
    expect(payload.title).toBe("Field kit");
    expect(payload.body).toContain("Live proof");
    expect(payload.href).toContain("/created/");
    expect(payload.href).toContain("live_challenge=ch1");
  });
});
