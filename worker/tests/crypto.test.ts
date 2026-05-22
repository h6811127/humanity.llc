import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  CRYPTO_ERROR,
  NonceReplayGuard,
  PAYLOAD_TYPES,
  getTestKeypair,
  resignDocument,
  signDocument,
  toCanonicalJson,
  verifySignedDocument,
  withProtocolFields,
} from "../src/crypto/index.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

function loadFixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(join(fixturesDir, `${name}.json`), "utf8")
  ) as T;
}

describe("JCS canonicalization", () => {
  it("orders object keys lexicographically", () => {
    const canonical = toCanonicalJson({ z: 1, a: 2, m: 3 });
    expect(canonical).toBe('{"a":2,"m":3,"z":1}');
  });

  it("preserves UTF-8 manifesto text deterministically", () => {
    const line = "Trust — naïve café 日本";
    const a = toCanonicalJson({ manifesto_line: line, type: "x", version: "1.0" });
    const b = toCanonicalJson({ version: "1.0", type: "x", manifesto_line: line });
    expect(a).toBe(b);
  });
});

describe("golden fixtures", () => {
  const cases = [
    ["card", PAYLOAD_TYPES.HUMANITY_CARD],
    ["qr_credential", PAYLOAD_TYPES.QR_CREDENTIAL],
    ["vouch", PAYLOAD_TYPES.VOUCH],
    ["revocation", PAYLOAD_TYPES.REVOCATION],
    ["badge", PAYLOAD_TYPES.BADGE],
    ["suspension", PAYLOAD_TYPES.SUSPENSION],
    ["export_manifest", PAYLOAD_TYPES.EXPORT_MANIFEST],
  ] as const;

  it.each(cases)("verifies %s fixture", async (file, expectedType) => {
    const doc = loadFixture<Record<string, unknown>>(file);
    const keys = loadFixture<{ public_key_base58: string }>("keys");
    const result = await verifySignedDocument(doc, {
      expectedType,
      expectedPublicKeyBase58: keys.public_key_base58,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.type).toBe(expectedType);
      expect(result.canonical.length).toBeGreaterThan(10);
    }
  });
});

describe("verifySignedDocument failures", () => {
  it("rejects tampered payload bytes", async () => {
    const doc = loadFixture<Record<string, unknown>>("card");
    const tampered = {
      ...doc,
      manifesto_line: "Tampered after signing.",
    };
    const result = await verifySignedDocument(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(CRYPTO_ERROR.INVALID_SIGNATURE);
    }
  });

  it("rejects payload type mismatch", async () => {
    const doc = loadFixture<Record<string, unknown>>("vouch");
    const result = await verifySignedDocument(doc, {
      expectedType: PAYLOAD_TYPES.REVOCATION,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(CRYPTO_ERROR.PAYLOAD_TYPE_MISMATCH);
    }
  });

  it("rejects card when public_key does not match signature", async () => {
    const doc = loadFixture<Record<string, unknown>>("card");
    const bad = { ...doc, public_key: "7Xk9mP2nQ4rT6vW8yZ1aB3cD6" };
    const result = await verifySignedDocument(bad);
    expect(result.ok).toBe(false);
  });

  it("rejects wrong protocol version at sign time", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const unsigned = withProtocolFields(
      {
        profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        nonce: "nonce_bad_001",
        revoked_at: "2026-05-16T17:00:00.000Z",
        reason: "owner_revoked",
      },
      PAYLOAD_TYPES.REVOCATION
    );
    (unsigned as { version?: string }).version = "0.9";
    await expect(
      signDocument(unsigned, { privateKey, publicKeyBase58 })
    ).rejects.toThrow(/version/i);
  });
});

describe("replay / nonce guard", () => {
  it("accepts first revocation nonce and rejects replay", async () => {
    const doc = loadFixture<Record<string, unknown>>("revocation");
    const guard = new NonceReplayGuard(
      (doc.profile_id as string) ?? "test"
    );

    const first = await verifySignedDocument(doc, { nonceGuard: guard });
    expect(first.ok).toBe(true);

    const second = await verifySignedDocument(doc, { nonceGuard: guard });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.code).toBe(CRYPTO_ERROR.REPLAYED_NONCE);
    }
  });

  it("accepts first vouch nonce and rejects replay", async () => {
    const doc = loadFixture<Record<string, unknown>>("vouch");
    const guard = new NonceReplayGuard(doc.vouchee_profile_id as string);

    expect((await verifySignedDocument(doc, { nonceGuard: guard })).ok).toBe(
      true
    );
    const replay = await verifySignedDocument(doc, { nonceGuard: guard });
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(replay.code).toBe(CRYPTO_ERROR.REPLAYED_NONCE);
    }
  });
});

describe("sign round-trip", () => {
  it("signs and verifies a new revocation in memory", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const unsigned = withProtocolFields(
      {
        profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        reason: "owner_revoked",
        revoked_at: new Date().toISOString(),
        nonce: `nonce_${Date.now()}`,
      },
      PAYLOAD_TYPES.REVOCATION
    );
    const signed = await signDocument(unsigned, { privateKey, publicKeyBase58 });
    const result = await verifySignedDocument(signed, {
      expectedType: PAYLOAD_TYPES.REVOCATION,
    });
    expect(result.ok).toBe(true);
  });

  it("resigns after field update", async () => {
    const doc = loadFixture<Record<string, unknown>>("card");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const updated = await resignDocument(
      { ...doc, manifesto_line: "Updated statement." },
      { privateKey, publicKeyBase58, signedAt: "2026-05-17T12:00:00.000Z" }
    );
    const result = await verifySignedDocument(updated, {
      expectedType: PAYLOAD_TYPES.HUMANITY_CARD,
      expectedPublicKeyBase58: publicKeyBase58,
    });
    expect(result.ok).toBe(true);
  });
});
