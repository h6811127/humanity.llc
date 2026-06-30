import { describe, expect, it } from "vitest";

import {
  anyClientVisible,
  clientDefersSwLiveProofPolling,
  buildLiveProofSwNotification,
  buildLiveProofSwNotificationFromPushHint,
  liveProofPollTargetsFromWallet,
  pendingLiveControlChallengeUrl,
  pollAllWalletEntriesForLiveProof,
  pollWalletEntriesForLiveProof,
  shouldShowSwLiveProofNotification,
  swLiveProofPollingShouldRun,
  resolveSwPeriodicMinIntervalMs,
  SW_PERIODIC_MIN_INTERVAL_MS,
  pruneSwPushHintCache,
  pushHintChallengeId,
  upsertSwPushHintCache,
  upsertCachedOsPlans,
  osPlanCacheKey,
} from "../../site/js/device-live-control-sw-core.mjs";
import { REFERENCE_FREE_POLICY } from "../../site/js/device-steward-entitlements-core.mjs";

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
  it("requires background alerts enabled and resolver ok (not Watch)", () => {
    expect(
      swLiveProofPollingShouldRun({
        enabled: true,
        watchLiveProofEnabled: true,
        resolverHealth: "ok",
      })
    ).toBe(true);
    expect(
      swLiveProofPollingShouldRun({
        enabled: true,
        watchLiveProofEnabled: false,
        resolverHealth: "ok",
      })
    ).toBe(true);
    expect(
      swLiveProofPollingShouldRun({ enabled: false, resolverHealth: "ok" })
    ).toBe(false);
    expect(
      swLiveProofPollingShouldRun({ enabled: true, resolverHealth: "degraded" })
    ).toBe(false);
  });

  it("skips SW polling when hosted push is healthy (E4d)", () => {
    expect(
      swLiveProofPollingShouldRun({
        enabled: true,
        watchLiveProofEnabled: true,
        resolverHealth: "ok",
        stewardPushEntitled: true,
        stewardPushHealthy: true,
      })
    ).toBe(false);
  });

  it("allows explicit pollNow when push is healthy (forcePoll)", () => {
    expect(
      swLiveProofPollingShouldRun({
        enabled: true,
        watchLiveProofEnabled: true,
        resolverHealth: "ok",
        stewardPushEntitled: true,
        stewardPushHealthy: true,
        forcePoll: true,
      })
    ).toBe(true);
  });
});

describe("SW_PERIODIC_MIN_INTERVAL_MS", () => {
  it("uses at least 15 minutes for periodic background polls", () => {
    expect(SW_PERIODIC_MIN_INTERVAL_MS).toBeGreaterThanOrEqual(15 * 60 * 1000);
  });
});

describe("resolveSwPeriodicMinIntervalMs", () => {
  it("defaults to free tier floor", () => {
    expect(resolveSwPeriodicMinIntervalMs()).toBe(SW_PERIODIC_MIN_INTERVAL_MS);
  });

  it("uses hosted policy interval when provided", () => {
    expect(
      resolveSwPeriodicMinIntervalMs({
        ...REFERENCE_FREE_POLICY,
        swPeriodicMinMs: 300_000,
      })
    ).toBe(300_000);
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

describe("pollAllWalletEntriesForLiveProof", () => {
  it("probes every pollable card in one wake", async () => {
    const entries = [
      { profile_id: PROFILE, qr_id: QR_ID, label: "A" },
      { profile_id: `${PROFILE}2`, qr_id: QR_ID_B, label: "B" },
    ];
    const fetched = [];
    const { pending, signature } = await pollAllWalletEntriesForLiveProof(
      entries,
      "http://127.0.0.1:8787",
      async (url) => {
        fetched.push(url);
        const isFirst = fetched.length === 1;
        return {
          ok: true,
          status: 200,
          body: isFirst
            ? {
                status: "pending",
                challenge_id: "ch_full_1",
                expires_at: new Date(Date.now() + 120_000).toISOString(),
              }
            : { status: "none" },
        };
      }
    );
    expect(fetched).toHaveLength(2);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.challenge_id).toBe("ch_full_1");
    expect(signature).toContain("ch_full_1");
  });

  it("stops on rate limit without probing remaining cards", async () => {
    const entries = [
      { profile_id: PROFILE, qr_id: QR_ID, label: "A" },
      { profile_id: `${PROFILE}2`, qr_id: QR_ID_B, label: "B" },
    ];
    let calls = 0;
    const { rateLimited } = await pollAllWalletEntriesForLiveProof(
      entries,
      "http://127.0.0.1:8787",
      async () => {
        calls += 1;
        return { ok: false, status: 429, body: null };
      }
    );
    expect(rateLimited).toBe(true);
    expect(calls).toBe(1);
  });
});

describe("sw push hint cache (Tier 1 hosted push → SW OS)", () => {
  const hint = {
    profile_id: PROFILE,
    qr_id: QR_ID,
    challenge_id: "ch_push_1",
    expires_at: new Date(Date.now() + 120_000).toISOString(),
  };

  it("upserts by challenge_id and prunes stale rows", () => {
    const now = Date.now();
    let cache = upsertSwPushHintCache([], hint, now);
    expect(cache).toHaveLength(1);
    expect(pushHintChallengeId(cache[0])).toBe("ch_push_1");

    cache = upsertSwPushHintCache(cache, { ...hint, challenge_id: "ch_push_2" }, now);
    expect(cache).toHaveLength(2);

    cache = upsertSwPushHintCache(cache, { ...hint, challenge_id: "ch_push_1" }, now + 1);
    expect(cache).toHaveLength(2);
    expect(cache.find((row) => pushHintChallengeId(row) === "ch_push_1")?.cachedAt).toBe(now + 1);

    cache = pruneSwPushHintCache(
      [
        hint,
        {
          profile_id: PROFILE,
          challenge_id: "ch_old",
          expires_at: "2020-01-01T00:00:00.000Z",
        },
      ],
      now
    );
    expect(cache).toHaveLength(1);
    expect(pushHintChallengeId(cache[0])).toBe("ch_push_1");
  });
});

describe("upsertCachedOsPlans", () => {
  it("dedupes plans by kind + dedupeKey", () => {
    const relay = {
      kind: "relay_offer",
      tag: "hc-relay-offer",
      dedupeKey: "1",
      title: "Finder message",
      body: "Open Humanity",
      openInboxOnClick: true,
      requireInteraction: true,
    };
    let cache = upsertCachedOsPlans([], [relay]);
    expect(cache).toHaveLength(1);
    cache = upsertCachedOsPlans(cache, [{ ...relay, title: "Updated title" }]);
    expect(cache).toHaveLength(1);
    expect(cache[0]?.title).toBe("Updated title");
    cache = upsertCachedOsPlans(cache, [{ ...relay, dedupeKey: "2", title: "2 messages" }]);
    expect(cache).toHaveLength(2);
    expect(osPlanCacheKey(relay)).toBe("relay_offer:1");
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

  it("does not defer SW when visible client is unfocused (Android PWA background)", () => {
    expect(
      clientDefersSwLiveProofPolling({
        visibilityState: "visible",
        focused: false,
      })
    ).toBe(false);
    expect(anyClientVisible([{ visibilityState: "visible", focused: false }])).toBe(
      false
    );
    expect(
      clientDefersSwLiveProofPolling({ visibilityState: "visible", focused: true })
    ).toBe(true);
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

describe("buildLiveProofSwNotificationFromPushHint", () => {
  it("builds notification payload from SSE push hint", () => {
    const payload = buildLiveProofSwNotificationFromPushHint(
      {
        profile_id: PROFILE,
        qr_id: QR_ID,
        challenge_id: "lc_push_1",
      },
      [{ profile_id: PROFILE, qr_id: QR_ID, label: "Push card" }],
      "http://localhost:8788"
    );
    expect(payload?.title).toBe("Push card");
    expect(payload?.href).toContain("live_challenge=lc_push_1");
  });

  it("returns null when wallet row is missing", () => {
    expect(
      buildLiveProofSwNotificationFromPushHint(
        { profile_id: PROFILE, challenge_id: "lc_push_1" },
        [],
        "http://localhost:8788"
      )
    ).toBeNull();
  });
});
