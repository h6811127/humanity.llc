import { describe, expect, it } from "vitest";

const TEST_QR_ID = "qr_xBZTq7M27tueCzBY";

import {
  buildDeviceCountsLabel,
  buildStatusSegmentsFromCounts,
  tabNoticeCountFromState,
} from "../../site/js/device-counts-core.mjs";
import {
  buildLiveControlProofHref,
  classifyChallengeHttpStatus,
  formatLiveControlExpiry,
  isPollableWalletEntry,
  liveControlInboxChanged,
  liveControlPendingSignature,
  parsePendingChallengeBody,
  summarizeLiveControlPoll,
} from "../../site/js/device-live-control-inbox-core.mjs";
import {
  qrIdFromScanUrl,
  walletEntryQrId,
} from "../../site/js/device-wallet.mjs";
import {
  isNetworkCacheFresh,
  mergeLastSeenFromNetworkMap,
  networkStatusChip,
  readCachedNetworkStatus,
  shouldUseCachedNetworkStatus,
  WALLET_NETWORK_CACHE_TTL_MS,
} from "../../site/js/device-wallet-network-core.mjs";
import { isRevokedSinceLastVisitFromBaseline } from "../../site/js/wallet-network-baseline.mjs";
import {
  humanTrustIconMeta,
  isEligibleVoucherState,
  verificationTrustChip,
} from "../../site/js/human-trust-ui.mjs";
import { parseNetworkVerification } from "../../site/js/device-wallet-network-core.mjs";

describe("humanTrustIconMeta", () => {
  it("uses green shield for Steward", () => {
    const meta = humanTrustIconMeta({ label: "Steward", state: "steward" });
    expect(meta.toneClass).toBe("list-icon-tone-green");
    expect(meta.svg).toContain("M12 22");
  });

  it("uses trust tone shield for Vouched Human", () => {
    const meta = humanTrustIconMeta({ label: "Vouched Human", state: "verified_human" });
    expect(meta.toneClass).toBe("list-icon-tone-trust");
  });
});

describe("verificationTrustChip", () => {
  it("labels steward and vouched distinctly", () => {
    expect(verificationTrustChip({ state: "steward" })).toEqual({
      label: "Steward",
      tone: "steward",
    });
    expect(verificationTrustChip({ state: "verified_human", label: "Vouched Human" })).toEqual({
      label: "Vouched Human",
      tone: "vouched",
    });
  });
});

describe("parseNetworkVerification", () => {
  it("reads label and state from status JSON", () => {
    expect(
      parseNetworkVerification({
        scan: {
          verification: { state: "steward", label: "Steward" },
          human_trust: { label: "Steward", subtitle: "x" },
        },
      })
    ).toEqual({ verificationLabel: "Steward", verificationState: "steward" });
  });
});

describe("isEligibleVoucherState", () => {
  it("allows verified_human and steward only", () => {
    expect(isEligibleVoucherState("steward")).toBe(true);
    expect(isEligibleVoucherState("verified_human")).toBe(true);
    expect(isEligibleVoucherState("registered")).toBe(false);
  });
});

describe("walletEntryQrId (DH-10)", () => {
  it("prefers stored qr_id over scan_url", () => {
    expect(
      walletEntryQrId({
        qr_id: "qr_xBZTq7M27tueCzBY",
        scan_url: "https://humanity.llc/c/p1?q=qr_Abcdefghijkmnop",
      })
    ).toBe("qr_xBZTq7M27tueCzBY");
  });

  it("reads q from scan_url when qr_id missing", () => {
    const url = "https://humanity.llc/c/nSVXWPqgRFEhGPjxyRzidF6s?q=qr_xBZTq7M27tueCzBY";
    expect(qrIdFromScanUrl(url)).toBe("qr_xBZTq7M27tueCzBY");
    expect(walletEntryQrId({ profile_id: "p1", scan_url: url })).toBe(
      "qr_xBZTq7M27tueCzBY"
    );
  });
});

describe("isPollableWalletEntry", () => {
  it("requires profile_id and qr_id strings", () => {
    expect(isPollableWalletEntry({ profile_id: "p1", qr_id: TEST_QR_ID })).toBe(
      true
    );
    expect(isPollableWalletEntry({ profile_id: "p1" })).toBe(false);
    expect(isPollableWalletEntry({ profile_id: "p1", qr_id: "" })).toBe(false);
    expect(isPollableWalletEntry(null)).toBe(false);
  });

  it("accepts scan_url with q when qr_id field is missing (DH-10)", () => {
    expect(
      isPollableWalletEntry({
        profile_id: "nSVXWPqgRFEhGPjxyRzidF6s",
        scan_url: "https://humanity.llc/c/nSVXWPqgRFEhGPjxyRzidF6s?q=qr_xBZTq7M27tueCzBY",
      })
    ).toBe(true);
  });
});

describe("parsePendingChallengeBody", () => {
  const entry = { profile_id: "p1", qr_id: TEST_QR_ID };

  it("accepts pending challenges with optional urls", () => {
    expect(
      parsePendingChallengeBody(
        {
          status: "pending",
          challenge_id: "c1",
          return_url: "https://scan.example/r",
          owner_url: "https://humanity.llc/created/?profile_id=p1",
          expires_at: "2026-05-25T20:00:00.000Z",
        },
        entry
      )
    ).toEqual({
      entry,
      challenge_id: "c1",
      return_url: "https://scan.example/r",
      owner_url: "https://humanity.llc/created/?profile_id=p1",
      expires_at: "2026-05-25T20:00:00.000Z",
    });
  });

  it("rejects non-pending or malformed bodies", () => {
    expect(parsePendingChallengeBody({ status: "done", challenge_id: "c1" }, entry)).toBe(
      null
    );
    expect(parsePendingChallengeBody({ status: "pending" }, entry)).toBe(null);
    expect(parsePendingChallengeBody(null, entry)).toBe(null);
  });
});

describe("liveControlPendingSignature", () => {
  it("orders ids deterministically", () => {
    const items = [
      { entry: { profile_id: "b" }, challenge_id: "2" },
      { entry: { profile_id: "a" }, challenge_id: "1" },
    ];
    expect(liveControlPendingSignature(items)).toBe("a:1|b:2");
  });
});

describe("liveControlInboxChanged", () => {
  const base = [{ entry: { profile_id: "a" }, challenge_id: "1" }];

  it("detects added or removed pending rows", () => {
    expect(liveControlInboxChanged(base, base)).toBe(false);
    expect(
      liveControlInboxChanged(base, [{ entry: { profile_id: "a" }, challenge_id: "2" }])
    ).toBe(true);
    expect(liveControlInboxChanged(base, [])).toBe(true);
  });
});

describe("formatLiveControlExpiry", () => {
  const now = Date.parse("2026-05-25T12:00:00.000Z");

  it("formats minute buckets", () => {
    expect(formatLiveControlExpiry("2026-05-25T12:00:20.000Z", now)).toBe("expires soon");
    expect(formatLiveControlExpiry("2026-05-25T12:01:00.000Z", now)).toBe("expires in 1 min");
    expect(formatLiveControlExpiry("2026-05-25T12:04:00.000Z", now)).toBe("expires in 4 min");
  });

  it("returns empty for invalid timestamps", () => {
    expect(formatLiveControlExpiry("not-a-date", now)).toBe("");
  });
});

describe("buildLiveControlProofHref", () => {
  it("prefers owner_url when provided", () => {
    expect(
      buildLiveControlProofHref({
        entry: { profile_id: "p1", qr_id: TEST_QR_ID },
        challenge_id: "c1",
        owner_url: "https://humanity.llc/created/?profile_id=p1&live_challenge=c1",
      })
    ).toBe("https://humanity.llc/created/?profile_id=p1&live_challenge=c1");
  });

  it("builds /created/ url with live_challenge when owner_url is absent", () => {
    expect(
      buildLiveControlProofHref(
        { entry: { profile_id: "p1", qr_id: TEST_QR_ID }, challenge_id: "c1" },
        "https://humanity.llc"
      )
    ).toBe(
      `https://humanity.llc/created/?profile_id=p1&qr_id=${TEST_QR_ID}&live_challenge=c1`
    );
  });
});

describe("networkStatusChip", () => {
  it("maps resolver statuses to chip labels and tones", () => {
    expect(networkStatusChip("active")).toEqual({
      label: "Live State Active",
      tone: "ok",
    });
    expect(networkStatusChip("revoked")).toEqual({
      label: "Revoked on Network",
      tone: "warn",
    });
    expect(networkStatusChip("offline")).toEqual({
      label: "Resolver Unreachable",
      tone: "offline",
    });
    expect(networkStatusChip("checking")).toEqual({
      label: "Sync Checking…",
      tone: "muted",
    });
    expect(networkStatusChip("active", "card_revoked")).toEqual({
      label: "Card disabled",
      tone: "warn",
    });
    expect(networkStatusChip("active", "qr_revoked")).toEqual({
      label: "QR revoked",
      tone: "warn",
    });
  });
});

describe("isNetworkCacheFresh", () => {
  it("respects ttl window", () => {
    const now = 1_000_000;
    expect(isNetworkCacheFresh(now - 1000, now, WALLET_NETWORK_CACHE_TTL_MS)).toBe(true);
    expect(isNetworkCacheFresh(now - WALLET_NETWORK_CACHE_TTL_MS - 1, now)).toBe(false);
    expect(isNetworkCacheFresh(undefined, now)).toBe(false);
  });
});

describe("readCachedNetworkStatus", () => {
  it("returns status only while cache entry is fresh", () => {
    const now = 500_000;
    const cache = {
      p1: { status: "active", at: now - 1000 },
      p2: { status: "revoked", at: now - WALLET_NETWORK_CACHE_TTL_MS - 1 },
    };
    expect(readCachedNetworkStatus(cache, "p1", now)).toBe("active");
    expect(readCachedNetworkStatus(cache, "p2", now)).toBe(null);
    expect(readCachedNetworkStatus(cache, "missing", now)).toBe(null);
  });
});

describe("mergeLastSeenFromNetworkMap", () => {
  it("updates baselines except cards in revoked-since-last-visit transition", () => {
    const next = mergeLastSeenFromNetworkMap(
      { a: "active", b: "card_revoked", c: "card_revoked" },
      { b: "active", c: "card_revoked" }
    );
    expect(next).toEqual({
      b: "active",
      c: "card_revoked",
      a: "active",
    });
    expect(isRevokedSinceLastVisitFromBaseline("active", "card_revoked")).toBe(true);
  });

  it("self-heals baseline when fetch returns non-revoked after false transition", () => {
    const next = mergeLastSeenFromNetworkMap({ card: "active" }, { card: "active" });
    expect(next).toEqual({ card: "active" });
    expect(isRevokedSinceLastVisitFromBaseline("active", "active")).toBe(false);
  });
});

describe("shouldUseCachedNetworkStatus", () => {
  it("bypasses cache when cached card_revoked disagrees with baseline", () => {
    const now = 1_000_000;
    const cached = { status: "revoked", scanKind: "card_revoked", at: now - 1000 };
    expect(
      shouldUseCachedNetworkStatus({ p1: "active" }, "p1", cached, now)
    ).toBe(false);
    expect(
      shouldUseCachedNetworkStatus({ p1: "card_revoked" }, "p1", cached, now)
    ).toBe(true);
  });
});

describe("tabNoticeCountFromState", () => {
  it("counts unsaved tab keys only", () => {
    expect(
      tabNoticeCountFromState(
        { profile_id: "p1", owner_private_key_b58: "k" },
        false
      )
    ).toBe(1);
    expect(
      tabNoticeCountFromState(
        { profile_id: "p1", owner_private_key_b58: "k" },
        true
      )
    ).toBe(0);
    expect(tabNoticeCountFromState(null, false)).toBe(0);
  });
});

describe("classifyChallengeHttpStatus", () => {
  it("maps 404 to none and 5xx to unreachable", () => {
    expect(classifyChallengeHttpStatus(404)).toBe("none");
    expect(classifyChallengeHttpStatus(200)).toBe("ok");
    expect(classifyChallengeHttpStatus(503)).toBe("unreachable");
  });
});

describe("summarizeLiveControlPoll", () => {
  const item = {
    entry: { profile_id: "p1", qr_id: TEST_QR_ID },
    challenge_id: "c1",
    return_url: null,
    owner_url: null,
    expires_at: "",
  };

  it("returns ok when all polls succeed with no pending", () => {
    expect(
      summarizeLiveControlPoll(
        [{ kind: "none" }, { kind: "none" }],
        2
      )
    ).toEqual({ pending: [], health: "ok" });
  });

  it("returns degraded when some polls fail", () => {
    const summary = summarizeLiveControlPoll(
      [{ kind: "pending", item }, { kind: "unreachable" }],
      2
    );
    expect(summary.pending).toHaveLength(1);
    expect(summary.health).toBe("degraded");
  });

  it("returns offline when every poll fails", () => {
    expect(
      summarizeLiveControlPoll([{ kind: "unreachable" }], 1).health
    ).toBe("offline");
  });
});

describe("buildStatusSegmentsFromCounts", () => {
  it("includes live proof segment when count is positive", () => {
    const segments = buildStatusSegmentsFromCounts({
      network: "ok",
      saved: 2,
      pins: 1,
      notices: 0,
      liveProof: 2,
    });
    expect(segments.some((s) => s.id === "liveproof")).toBe(true);
    expect(segments.find((s) => s.id === "liveproof")?.label).toBe(
      "2 Live Proof Waiting"
    );
  });

  it("highlights tab keys when notices are present", () => {
    const segments = buildStatusSegmentsFromCounts({
      network: "degraded",
      saved: 0,
      pins: 0,
      notices: 1,
      liveProof: 0,
    });
    const notices = segments.find((s) => s.id === "notices");
    expect(notices?.label).toBe("Tab Keys Active");
    expect(notices?.chipLabel).toBe("Tab keys");
    expect(notices?.highlight).toBe(true);
  });

  it("omits tab keys chip when no unsaved keys in tab", () => {
    const segments = buildStatusSegmentsFromCounts({
      network: "ok",
      saved: 1,
      pins: 0,
      notices: 0,
      liveProof: 0,
    });
    expect(segments.find((s) => s.id === "notices")).toBeUndefined();
    expect(segments.find((s) => s.id === "network")?.chipLabel).toBe(
      "Network reachable"
    );
  });

  it("shows proof check limited when poll health is degraded", () => {
    const segments = buildStatusSegmentsFromCounts({
      network: "ok",
      saved: 1,
      pins: 0,
      notices: 0,
      liveProof: 0,
      pollableSaved: 1,
      liveProofPollHealth: "degraded",
    });
    expect(segments.find((s) => s.id === "liveproof")?.label).toBe(
      "Proof Check Limited"
    );
  });
});

describe("buildDeviceCountsLabel", () => {
  it("joins saved and pinned counts", () => {
    expect(buildDeviceCountsLabel(2, 3)).toEqual({
      saved: 2,
      pins: 3,
      total: 5,
      label: "2 on Device · 3 Pinned",
    });
    expect(buildDeviceCountsLabel(0, 0).label).toBe("");
  });
});
