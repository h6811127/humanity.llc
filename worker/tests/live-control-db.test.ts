import { describe, expect, it } from "vitest";

import {
  getLatestPendingLiveControlChallenge,
  getLiveControlChallenge,
  getRecentLiveControlProof,
  insertLiveControlChallenge,
  markLiveControlExpired,
  markLiveControlProven,
  type LiveControlChallengeRow,
} from "../src/db/live-control";

const PROFILE = "nSVXWPqgRFEhGPjxyRzidF6s";
const OTHER = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_A = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR_B = "qr_nSVXWPqgRFEhGPjxyRzidF6s";
const CH_PENDING = "lc_pendingChallengeAa";
const CH_OLDER = "lc_olderPendingChallenge";
const CH_EXPIRED = "lc_expiredPendingChallenge";
const CH_PROVEN = "lc_provenChallengeAa";
const CH_OLD_PROOF = "lc_olderProvenChallenge";
const ISSUED = "2026-08-15T10:00:00.000Z";
const LATER = "2026-08-15T10:01:00.000Z";
const EXPIRES = "2026-08-15T10:05:00.000Z";
const NOW = "2026-08-15T10:02:00.000Z";
const CUTOFF = "2026-08-15T09:59:00.000Z";

class FakeLiveControlDb {
  rows = new Map<string, LiveControlChallengeRow>();

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM live_control_challenges WHERE challenge_id = ?")) {
              return (self.rows.get(String(args[0])) ?? null) as T | null;
            }
            if (sql.includes("FROM live_control_challenges") && sql.includes("profile_id = ?")) {
              const profileId = String(args[0]);
              const qrId = String(args[1]);
              const third = String(args[2]);
              const matches = Array.from(self.rows.values()).filter((row) => {
                if (row.profile_id !== profileId || row.qr_id !== qrId) return false;
                if (sql.includes("status = 'proven'")) {
                  if (row.status !== "proven") return false;
                  if (sql.includes("proven_at > ?") && !(row.proven_at && row.proven_at > third)) {
                    return false;
                  }
                  return true;
                }
                if (sql.includes("status = 'pending'")) {
                  if (row.status !== "pending") return false;
                  if (sql.includes("expires_at > ?") && !(row.expires_at > third)) {
                    return false;
                  }
                  return true;
                }
                return false;
              });
              if (sql.includes("ORDER BY proven_at DESC")) {
                matches.sort((a, b) => (b.proven_at ?? "").localeCompare(a.proven_at ?? ""));
              }
              if (sql.includes("ORDER BY issued_at DESC")) {
                matches.sort((a, b) => b.issued_at.localeCompare(a.issued_at));
              }
              return (matches[0] ?? null) as T | null;
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO live_control_challenges")) {
              const row: LiveControlChallengeRow = {
                challenge_id: String(args[0]),
                profile_id: String(args[1]),
                qr_id: (args[2] as string | null) ?? null,
                nonce: String(args[3]),
                verifier_session_id: String(args[4]),
                status: "pending",
                issued_at: String(args[5]),
                expires_at: String(args[6]),
                proven_at: null,
                signer_public_key: null,
                response_document_json: null,
                created_at: String(args[7]),
                updated_at: String(args[8]),
              };
              self.rows.set(row.challenge_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("SET status = 'expired'") && sql.includes("status = 'pending'")) {
              const challengeId = String(args[1]);
              const existing = self.rows.get(challengeId);
              if (!existing || existing.status !== "pending") {
                return { success: true, meta: { changes: 0 } };
              }
              self.rows.set(challengeId, {
                ...existing,
                status: "expired",
                updated_at: String(args[0]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("SET status = 'proven'") && sql.includes("status = 'pending'")) {
              const challengeId = String(args[4]);
              const existing = self.rows.get(challengeId);
              if (!existing || existing.status !== "pending") {
                return { success: true, meta: { changes: 0 } };
              }
              self.rows.set(challengeId, {
                ...existing,
                status: "proven",
                proven_at: String(args[0]),
                signer_public_key: String(args[1]),
                response_document_json: String(args[2]),
                updated_at: String(args[3]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function db(fake: FakeLiveControlDb): D1Database {
  return fake as unknown as D1Database;
}

function seed(fake: FakeLiveControlDb) {
  fake.rows.set(CH_PENDING, {
    challenge_id: CH_PENDING,
    profile_id: PROFILE,
    qr_id: QR_A,
    nonce: "nonce_pending",
    verifier_session_id: "vs_pending",
    status: "pending",
    issued_at: LATER,
    expires_at: EXPIRES,
    proven_at: null,
    signer_public_key: null,
    response_document_json: null,
    created_at: LATER,
    updated_at: LATER,
  });
  fake.rows.set(CH_OLDER, {
    challenge_id: CH_OLDER,
    profile_id: PROFILE,
    qr_id: QR_A,
    nonce: "nonce_older",
    verifier_session_id: "vs_older",
    status: "pending",
    issued_at: ISSUED,
    expires_at: EXPIRES,
    proven_at: null,
    signer_public_key: null,
    response_document_json: null,
    created_at: ISSUED,
    updated_at: ISSUED,
  });
  fake.rows.set(CH_EXPIRED, {
    challenge_id: CH_EXPIRED,
    profile_id: PROFILE,
    qr_id: QR_A,
    nonce: "nonce_expired",
    verifier_session_id: "vs_expired",
    status: "pending",
    issued_at: ISSUED,
    expires_at: "2026-08-15T10:01:30.000Z",
    proven_at: null,
    signer_public_key: null,
    response_document_json: null,
    created_at: ISSUED,
    updated_at: ISSUED,
  });
  fake.rows.set(CH_PROVEN, {
    challenge_id: CH_PROVEN,
    profile_id: PROFILE,
    qr_id: QR_A,
    nonce: "nonce_proven",
    verifier_session_id: "vs_proven",
    status: "proven",
    issued_at: ISSUED,
    expires_at: EXPIRES,
    proven_at: "2026-08-15T10:00:30.000Z",
    signer_public_key: "pk_owner",
    response_document_json: "{}",
    created_at: ISSUED,
    updated_at: "2026-08-15T10:00:30.000Z",
  });
  fake.rows.set(CH_OLD_PROOF, {
    challenge_id: CH_OLD_PROOF,
    profile_id: PROFILE,
    qr_id: QR_A,
    nonce: "nonce_old_proof",
    verifier_session_id: "vs_old_proof",
    status: "proven",
    issued_at: "2026-08-15T09:00:00.000Z",
    expires_at: "2026-08-15T09:05:00.000Z",
    proven_at: "2026-08-15T09:01:00.000Z",
    signer_public_key: "pk_owner",
    response_document_json: "{}",
    created_at: "2026-08-15T09:00:00.000Z",
    updated_at: "2026-08-15T09:01:00.000Z",
  });
  fake.rows.set("lc_otherProfileProof", {
    challenge_id: "lc_otherProfileProof",
    profile_id: OTHER,
    qr_id: QR_A,
    nonce: "nonce_other",
    verifier_session_id: "vs_other",
    status: "proven",
    issued_at: ISSUED,
    expires_at: EXPIRES,
    proven_at: LATER,
    signer_public_key: "pk_other",
    response_document_json: "{}",
    created_at: ISSUED,
    updated_at: LATER,
  });
  fake.rows.set("lc_otherQrProof", {
    challenge_id: "lc_otherQrProof",
    profile_id: PROFILE,
    qr_id: QR_B,
    nonce: "nonce_other_qr",
    verifier_session_id: "vs_other_qr",
    status: "proven",
    issued_at: ISSUED,
    expires_at: EXPIRES,
    proven_at: LATER,
    signer_public_key: "pk_owner",
    response_document_json: "{}",
    created_at: ISSUED,
    updated_at: LATER,
  });
}

describe("live-control db helpers", () => {
  it("getRecentLiveControlProof returns the newest proven row after the cutoff for that QR only", async () => {
    const fake = new FakeLiveControlDb();
    seed(fake);

    const recent = await getRecentLiveControlProof(db(fake), PROFILE, QR_A, CUTOFF);
    expect(recent?.challenge_id).toBe(CH_PROVEN);

    await expect(
      getRecentLiveControlProof(db(fake), PROFILE, QR_A, "2026-08-15T10:00:30.000Z")
    ).resolves.toBeNull();
    await expect(getRecentLiveControlProof(db(fake), OTHER, QR_A, CUTOFF)).resolves.toMatchObject({
      challenge_id: "lc_otherProfileProof",
    });
    await expect(getRecentLiveControlProof(db(fake), PROFILE, QR_B, CUTOFF)).resolves.toMatchObject({
      challenge_id: "lc_otherQrProof",
    });
  });

  it("getLatestPending ignores expired and proven rows and returns the newest unexpired pending", async () => {
    const fake = new FakeLiveControlDb();
    seed(fake);

    const pending = await getLatestPendingLiveControlChallenge(db(fake), PROFILE, QR_A, NOW);
    expect(pending?.challenge_id).toBe(CH_PENDING);

    await expect(
      getLatestPendingLiveControlChallenge(db(fake), PROFILE, QR_B, NOW)
    ).resolves.toBeNull();
    await expect(
      getLatestPendingLiveControlChallenge(db(fake), OTHER, QR_A, NOW)
    ).resolves.toBeNull();
  });

  it("markLiveControlProven only advances a pending challenge", async () => {
    const fake = new FakeLiveControlDb();
    seed(fake);

    await markLiveControlProven(db(fake), {
      challengeId: CH_PENDING,
      signerPublicKey: "pk_owner",
      responseDocumentJson: '{"ok":true}',
      provenAt: NOW,
    });
    await expect(getLiveControlChallenge(db(fake), CH_PENDING)).resolves.toMatchObject({
      status: "proven",
      proven_at: NOW,
      signer_public_key: "pk_owner",
      response_document_json: '{"ok":true}',
    });

    await markLiveControlProven(db(fake), {
      challengeId: CH_PROVEN,
      signerPublicKey: "pk_attacker",
      responseDocumentJson: '{"forged":true}',
      provenAt: NOW,
    });
    await expect(getLiveControlChallenge(db(fake), CH_PROVEN)).resolves.toMatchObject({
      status: "proven",
      signer_public_key: "pk_owner",
      response_document_json: "{}",
    });
  });

  it("markLiveControlExpired only expires pending rows and leaves proven proofs intact", async () => {
    const fake = new FakeLiveControlDb();
    seed(fake);

    await markLiveControlExpired(db(fake), CH_OLDER, NOW);
    await expect(getLiveControlChallenge(db(fake), CH_OLDER)).resolves.toMatchObject({
      status: "expired",
      updated_at: NOW,
    });

    await markLiveControlExpired(db(fake), CH_PROVEN, NOW);
    await expect(getLiveControlChallenge(db(fake), CH_PROVEN)).resolves.toMatchObject({
      status: "proven",
      proven_at: "2026-08-15T10:00:30.000Z",
    });
  });

  it("insert creates a pending challenge that getLiveControlChallenge can read back", async () => {
    const fake = new FakeLiveControlDb();
    await insertLiveControlChallenge(db(fake), {
      challengeId: "lc_freshChallengeAa",
      profileId: PROFILE,
      qrId: QR_A,
      nonce: "nonce_fresh",
      verifierSessionId: "vs_fresh",
      issuedAt: ISSUED,
      expiresAt: EXPIRES,
    });

    await expect(getLiveControlChallenge(db(fake), "lc_freshChallengeAa")).resolves.toMatchObject({
      challenge_id: "lc_freshChallengeAa",
      profile_id: PROFILE,
      qr_id: QR_A,
      status: "pending",
      nonce: "nonce_fresh",
      proven_at: null,
    });
    await expect(
      getLatestPendingLiveControlChallenge(db(fake), PROFILE, QR_A, NOW)
    ).resolves.toMatchObject({ challenge_id: "lc_freshChallengeAa" });
  });
});
