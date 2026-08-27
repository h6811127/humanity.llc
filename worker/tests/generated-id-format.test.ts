import { describe, expect, it } from "vitest";

import {
  BASE58_ALPHABET,
  PROFILE_ID_LENGTH_NEW,
  PROFILE_ID_REGEX,
} from "../src/crypto/constants";
import {
  generateArtifactIntentId,
  generateCommerceOrderId,
  generateLiveControlChallengeId,
  generatePrintArtifactId,
  generatePrintOrderId,
  generatePrintQuoteId,
  generateProfileId,
  generateQrId,
  generateRelayOfferId,
  generateStewardPushConnectionId,
  generateVerifierSessionId,
  randomBase58,
} from "../src/id";
import { RELAY_OFFER_ID_REGEX } from "../src/live-object/lost-item-offer-core";
import { LIVE_CONTROL_CHALLENGE_ID_REGEX } from "../src/resolver/live-control";
import { PRINT_ARTIFACT_ID_REGEX } from "../src/resolver/mint-print-artifact-qr";
import { QR_ID_REGEX } from "../src/resolver/scan-state";

const BASE58_BODY = new RegExp(`^[${BASE58_ALPHABET}]+$`);

function expectPrefixedBase58(value: string, prefix: string, bodyLength: number): void {
  expect(value.startsWith(prefix)).toBe(true);
  const body = value.slice(prefix.length);
  expect(body).toHaveLength(bodyLength);
  expect(body).toMatch(BASE58_BODY);
  expect(body).not.toMatch(/[0OIl]/);
}

describe("generated opaque ids", () => {
  it("emits Base58 bodies without 0 O I l", () => {
    const body = randomBase58(32);
    expect(body).toHaveLength(32);
    expect(body).toMatch(BASE58_BODY);
    expect(body).not.toMatch(/[0OIl]/);
  });

  it("generates 24-char profile ids accepted by PROFILE_ID_REGEX", () => {
    const profileId = generateProfileId();
    expect(profileId).toHaveLength(PROFILE_ID_LENGTH_NEW);
    expect(profileId).toMatch(PROFILE_ID_REGEX);
    expect(profileId).not.toMatch(/[0OIl]/);
  });

  it("generates qr_ / pa_ / ro_ / lc_ ids that match resolver regexes", () => {
    const qrId = generateQrId();
    expectPrefixedBase58(qrId, "qr_", 16);
    expect(qrId).toMatch(QR_ID_REGEX);

    const printArtifactId = generatePrintArtifactId();
    expectPrefixedBase58(printArtifactId, "pa_", 16);
    expect(printArtifactId).toMatch(PRINT_ARTIFACT_ID_REGEX);

    const relayOfferId = generateRelayOfferId();
    expectPrefixedBase58(relayOfferId, "ro_", 18);
    expect(relayOfferId).toMatch(RELAY_OFFER_ID_REGEX);

    const challengeId = generateLiveControlChallengeId();
    expectPrefixedBase58(challengeId, "lc_", 18);
    expect(challengeId).toMatch(LIVE_CONTROL_CHALLENGE_ID_REGEX);
  });

  it("keeps merch and session prefixes + lengths stable", () => {
    expectPrefixedBase58(generateArtifactIntentId(), "ai_", 16);
    expectPrefixedBase58(generateCommerceOrderId(), "co_", 16);
    expectPrefixedBase58(generatePrintOrderId(), "po_", 16);
    expectPrefixedBase58(generatePrintQuoteId(), "pq_", 16);
    expectPrefixedBase58(generateVerifierSessionId(), "vs_", 18);
    expectPrefixedBase58(generateStewardPushConnectionId(), "conn_", 16);
  });
});
