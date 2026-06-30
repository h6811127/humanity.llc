import { describe, expect, it } from "vitest";

import {
  decodeBase64Url,
  encodeBase64Url,
  forgeVapidJwt,
  importVapidKeyPair,
  stewardWebPushContactFromEnv,
  stewardWebPushSendConfigured,
} from "../src/steward/web-push-send-core";
import { liveProofPendingWebPushPayload } from "../src/steward/web-push-send";
import { LIVE_PROOF_PENDING_TYPE } from "../src/steward/push";

/** Test VAPID keys (generate once; safe for unit tests only). */
const TEST_VAPID_PUBLIC =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const TEST_VAPID_PRIVATE =
  "UUxI4O8-FbRPOA3_Z-vy_xYs9DIFYP5dYKI13sOJEvI";

describe("stewardWebPushSendConfigured", () => {
  it("requires both VAPID keys", () => {
    expect(
      stewardWebPushSendConfigured({
        STEWARD_VAPID_PUBLIC_KEY: TEST_VAPID_PUBLIC,
        STEWARD_VAPID_PRIVATE_KEY: TEST_VAPID_PRIVATE,
      })
    ).toBe(true);
    expect(
      stewardWebPushSendConfigured({
        STEWARD_VAPID_PUBLIC_KEY: TEST_VAPID_PUBLIC,
      })
    ).toBe(false);
  });
});

describe("forgeVapidJwt", () => {
  it("returns a three-part JWT", async () => {
    const keys = await importVapidKeyPair(TEST_VAPID_PUBLIC, TEST_VAPID_PRIVATE);
    const token = await forgeVapidJwt(keys.privateKey, {
      sub: "mailto:push@humanity.llc",
      aud: "https://fcm.googleapis.com",
      exp: 1_700_000_000,
    });
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("liveProofPendingWebPushPayload", () => {
  it("matches SSE JSON allowlist", () => {
    const json = liveProofPendingWebPushPayload({
      type: LIVE_PROOF_PENDING_TYPE,
      version: 1,
      operator_id: "humanity.llc",
      account_id: "acc_1",
      profile_id: "prof_1",
      qr_id: "qr_1",
      challenge_id: "lc_1",
      issued_at: "2026-05-26T12:00:00.000Z",
      expires_at: "2026-05-26T12:02:00.000Z",
    });
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("live_proof.pending");
    expect(parsed.challenge_id).toBe("lc_1");
    expect(parsed.profile_id).toBe("prof_1");
  });
});

describe("base64url helpers", () => {
  it("round-trips bytes", () => {
    const raw = Uint8Array.from([1, 2, 3, 250]);
    expect(decodeBase64Url(encodeBase64Url(raw))).toEqual(raw);
  });
});

describe("stewardWebPushContactFromEnv", () => {
  it("defaults and normalizes mailto", () => {
    expect(stewardWebPushContactFromEnv({})).toBe("mailto:push@humanity.llc");
    expect(stewardWebPushContactFromEnv({ STEWARD_VAPID_CONTACT: "ops@humanity.llc" })).toBe(
      "mailto:ops@humanity.llc"
    );
  });
});
