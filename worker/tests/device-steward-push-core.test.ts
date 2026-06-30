import { describe, expect, it } from "vitest";

import {
  isConnectionAckPushPayload,
  isLiveProofPendingPushPayload,
  isStaleLiveProofPushEvent,
  parseSseMessageBlock,
  parseStewardPushEventPayload,
  parseWebPushMessageData,
  serializePushSubscriptionForSubscribe,
  shouldMaintainStewardPushConnection,
  shouldMaintainStewardWebPushSubscription,
  STEWARD_PUSH_DOWN_FALLBACK_MS,
  STEWARD_PUSH_EVENT_CONNECTION_ACK,
  STEWARD_PUSH_EVENT_LIVE_PROOF_PENDING,
  stewardPushInFallbackCooldown,
  stewardWebPushVapidPublicKeyFromCapabilities,
  urlBase64ToUint8Array,
} from "../../site/js/device-steward-push-core.mjs";

describe("parseSseMessageBlock", () => {
  it("parses a complete live_proof SSE message", () => {
    const frame =
      'event: live_proof\nid: lc_abc\n data: {"type":"live_proof.pending","profile_id":"p1"}\n\n';
    const { messages, remainder } = parseSseMessageBlock(frame);
    expect(remainder).toBe("");
    expect(messages).toHaveLength(1);
    expect(messages[0].event).toBe("live_proof");
    const payload = parseStewardPushEventPayload(messages[0].data);
    expect(payload?.type).toBe(STEWARD_PUSH_EVENT_LIVE_PROOF_PENDING);
    expect(payload?.profile_id).toBe("p1");
  });

  it("ignores comment heartbeat lines", () => {
    const { messages } = parseSseMessageBlock(": ping\n\n");
    expect(messages).toHaveLength(0);
  });
});

describe("isStaleLiveProofPushEvent", () => {
  it("drops expired events", () => {
    expect(
      isStaleLiveProofPushEvent(
        { type: STEWARD_PUSH_EVENT_LIVE_PROOF_PENDING, expires_at: "2020-01-01T00:00:00.000Z" },
        Date.parse("2026-05-26T12:00:00.000Z")
      )
    ).toBe(true);
  });
});

describe("shouldMaintainStewardPushConnection", () => {
  const base = {
    pushEntitled: true,
    watchEnabled: true,
    browserAlertsEnabled: true,
    hasSession: true,
    pollLeader: true,
    scopeActive: true,
    documentVisible: true,
    inFallbackCooldown: false,
  };

  it("requires all gates", () => {
    expect(shouldMaintainStewardPushConnection(base)).toBe(true);
    expect(
      shouldMaintainStewardPushConnection({ ...base, pushEntitled: false })
    ).toBe(false);
    expect(
      shouldMaintainStewardPushConnection({ ...base, pollLeader: false })
    ).toBe(false);
    expect(
      shouldMaintainStewardPushConnection({ ...base, inFallbackCooldown: true })
    ).toBe(false);
  });
});

describe("stewardPushInFallbackCooldown", () => {
  it("is true within 60s of last down", () => {
    const now = 1_000_000;
    expect(stewardPushInFallbackCooldown(now - 30_000, now)).toBe(true);
    expect(
      stewardPushInFallbackCooldown(now - STEWARD_PUSH_DOWN_FALLBACK_MS, now)
    ).toBe(false);
  });
});

describe("push payload helpers", () => {
  it("classifies ack and pending", () => {
    expect(
      isConnectionAckPushPayload({ type: STEWARD_PUSH_EVENT_CONNECTION_ACK })
    ).toBe(true);
    expect(
      isLiveProofPendingPushPayload({ type: STEWARD_PUSH_EVENT_LIVE_PROOF_PENDING })
    ).toBe(true);
  });
});

describe("Tier 2 Web Push helpers", () => {
  it("parseWebPushMessageData reads JSON push payloads", async () => {
    const payload = await parseWebPushMessageData({
      json: async () => ({
        type: STEWARD_PUSH_EVENT_LIVE_PROOF_PENDING,
        profile_id: "p1",
        challenge_id: "c1",
      }),
    } as PushMessageData);
    expect(payload?.profile_id).toBe("p1");
    expect(payload?.challenge_id).toBe("c1");
  });

  it("shouldMaintainStewardWebPushSubscription requires VAPID key", () => {
    expect(
      shouldMaintainStewardWebPushSubscription({
        pushEntitled: true,
        browserAlertsEnabled: true,
        hasSession: true,
        vapidPublicKey: "abc",
      })
    ).toBe(true);
    expect(
      shouldMaintainStewardWebPushSubscription({
        pushEntitled: true,
        browserAlertsEnabled: true,
        hasSession: true,
        vapidPublicKey: "",
      })
    ).toBe(false);
  });

  it("stewardWebPushVapidPublicKeyFromCapabilities reads operator extension", () => {
    expect(
      stewardWebPushVapidPublicKeyFromCapabilities({
        extensions: {
          hosted_steward: {
            web_push: { vapid_public_key: "  test-key  " },
          },
        },
      })
    ).toBe("test-key");
  });

  it("urlBase64ToUint8Array decodes URL-safe base64", () => {
    const bytes = urlBase64ToUint8Array("AQID");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("serializePushSubscriptionForSubscribe maps PushSubscription JSON", () => {
    const body = serializePushSubscriptionForSubscribe({
      expirationTime: null,
      toJSON: () => ({
        endpoint: "https://push.example/1",
        keys: { p256dh: "p", auth: "a" },
      }),
    } as PushSubscription);
    expect(body.endpoint).toBe("https://push.example/1");
    expect(body.keys.auth).toBe("a");
  });
});
