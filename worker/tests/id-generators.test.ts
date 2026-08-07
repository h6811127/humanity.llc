import { describe, expect, it } from "vitest";

import { BASE58_ALPHABET, PROFILE_ID_LENGTH_NEW } from "../src/crypto/constants";
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

const BASE58_RE = new RegExp(`^[${BASE58_ALPHABET}]+$`);

describe("id generators", () => {
  it("randomBase58 stays inside the Bitcoin base58 alphabet", () => {
    const sample = randomBase58(64);
    expect(sample).toHaveLength(64);
    expect(sample).toMatch(BASE58_RE);
    expect(sample).not.toMatch(/[0OIl]/);
  });

  it("keeps stable prefixes and lengths for protocol ids", () => {
    const cases: Array<[() => string, RegExp]> = [
      [generateProfileId, new RegExp(`^[${BASE58_ALPHABET}]{${PROFILE_ID_LENGTH_NEW}}$`)],
      [generateQrId, new RegExp(`^qr_[${BASE58_ALPHABET}]{16}$`)],
      [generateArtifactIntentId, new RegExp(`^ai_[${BASE58_ALPHABET}]{16}$`)],
      [generatePrintArtifactId, new RegExp(`^pa_[${BASE58_ALPHABET}]{16}$`)],
      [generateCommerceOrderId, new RegExp(`^co_[${BASE58_ALPHABET}]{16}$`)],
      [generatePrintOrderId, new RegExp(`^po_[${BASE58_ALPHABET}]{16}$`)],
      [generatePrintQuoteId, new RegExp(`^pq_[${BASE58_ALPHABET}]{16}$`)],
      [generateRelayOfferId, new RegExp(`^ro_[${BASE58_ALPHABET}]{18}$`)],
      [generateLiveControlChallengeId, new RegExp(`^lc_[${BASE58_ALPHABET}]{18}$`)],
      [generateVerifierSessionId, new RegExp(`^vs_[${BASE58_ALPHABET}]{18}$`)],
      [generateStewardPushConnectionId, new RegExp(`^conn_[${BASE58_ALPHABET}]{16}$`)],
    ];

    for (const [factory, pattern] of cases) {
      const id = factory();
      expect(id).toMatch(pattern);
    }
  });

  it("does not collide across a short burst of profile ids", () => {
    const ids = new Set(Array.from({ length: 40 }, () => generateProfileId()));
    expect(ids.size).toBe(40);
  });
});
