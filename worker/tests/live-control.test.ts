import { describe, expect, it } from "vitest";

import * as ed from "@noble/ed25519";

import {
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import type { CardRow, QrCredentialRow, VerificationSummaryRow } from "../src/db/types";
import {
  handleGetLiveControlChallenge,
  handleGetPendingLiveControlChallenge,
  handlePostLiveControlChallenge,
  handlePostLiveControlResponse,
} from "../src/resolver/live-control";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

function card(publicKey: string, overrides: Partial<CardRow> = {}): CardRow {
  return {
    profile_id: PROFILE,
    public_key: publicKey,
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Open studio",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function qr(overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "card",
    print_artifact_id: null,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: "2027-05-16T17:00:00Z",
    credential_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function summary(): VerificationSummaryRow {
  return {
    profile_id: PROFILE,
    state: "registered",
    level: 1,
    label: "Registered",
    method: "registered",
    vouch_count: 0,
    latest_accepted_vouch_at: null,
    credential_ids_json: "[]",
    summary_document_json: null,
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function request(body: unknown): Request {
  return new Request(
    `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/live-control/challenges`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function dbFor(rows: {
  card: CardRow;
  qr: QrCredentialRow;
  verification?: VerificationSummaryRow | null;
}): D1Database {
  const challenges: Record<string, Record<string, unknown>> = {};
  return {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM cards")) {
            return {
              ...rows.card,
              recovery_public_key:
                (rows.card as CardRow & { recovery_public_key?: string | null })
                  .recovery_public_key ?? null,
              issuer_public_key: null,
            };
          }
          if (sql.includes("FROM qr_credentials")) return rows.qr;
          if (sql.includes("FROM verification_summaries")) {
            return rows.verification ?? summary();
          }
          if (sql.includes("FROM live_control_challenges")) {
            if (sql.includes("ORDER BY issued_at DESC")) {
              const [profile_id, qr_id, nowIso] = params;
              const pending = Object.values(challenges).find(
                (row) =>
                  row.profile_id === profile_id &&
                  row.qr_id === qr_id &&
                  row.status === "pending" &&
                  String(row.expires_at) > String(nowIso)
              );
              return pending ?? null;
            }
            return challenges[String(params[0])] ?? null;
          }
          return null;
        },
        run: async () => {
          if (sql.includes("INSERT INTO live_control_challenges")) {
            const [
              challenge_id,
              profile_id,
              qr_id,
              nonce,
              verifier_session_id,
              issued_at,
              expires_at,
              created_at,
              updated_at,
            ] = params;
            challenges[String(challenge_id)] = {
              challenge_id,
              profile_id,
              qr_id,
              nonce,
              verifier_session_id,
              status: "pending",
              issued_at,
              expires_at,
              proven_at: null,
              signer_public_key: null,
              response_document_json: null,
              created_at,
              updated_at,
            };
          }
          if (sql.includes("SET status = 'proven'")) {
            const [proven_at, signer_public_key, response_document_json, updated_at, id] =
              params;
            Object.assign(challenges[String(id)], {
              status: "proven",
              proven_at,
              signer_public_key,
              response_document_json,
              updated_at,
            });
          }
          if (sql.includes("SET status = 'expired'")) {
            const [updated_at, id] = params;
            Object.assign(challenges[String(id)], {
              status: "expired",
              updated_at,
            });
          }
          return { success: true };
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("live control proof alpha", () => {
  it("creates a short-lived challenge for an active scan", async () => {
    const owner = await getTestKeypair();
    const db = dbFor({ card: card(owner.publicKeyBase58), qr: qr() });

    const res = await handlePostLiveControlChallenge(
      request({ qr_id: QR }),
      db,
      PROFILE
    );
    const json = (await res.json()) as {
      status: string;
      challenge_id: string;
      owner_url: string;
    };

    expect(res.status).toBe(201);
    expect(json.status).toBe("pending");
    expect(json.challenge_id).toMatch(/^lc_/);
    expect(json.owner_url).toContain("live_challenge=");
    expect(json.owner_url).toContain("profile_id=");
    expect(json.owner_url).toContain("qr_id=");
    expect(json.owner_url).toContain("return_url=");
  });

  it("returns the latest pending challenge for a QR", async () => {
    const owner = await getTestKeypair();
    const db = dbFor({ card: card(owner.publicKeyBase58), qr: qr() });
    const createRes = await handlePostLiveControlChallenge(
      request({ qr_id: QR }),
      db,
      PROFILE
    );
    const created = (await createRes.json()) as { challenge_id: string };

    const pendingRes = await handleGetPendingLiveControlChallenge(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/live-control/challenges?qr_id=${QR}`
      ),
      db,
      PROFILE
    );
    const pending = (await pendingRes.json()) as {
      challenge_id: string;
      status: string;
      return_url: string | null;
    };

    expect(pendingRes.status).toBe(200);
    expect(pending.status).toBe("pending");
    expect(pending.challenge_id).toBe(created.challenge_id);
    expect(pending.return_url).toContain(`/c/${PROFILE}`);
  });

  it("returns 304 for pending challenge when If-None-Match matches", async () => {
    const owner = await getTestKeypair();
    const db = dbFor({ card: card(owner.publicKeyBase58), qr: qr() });
    await handlePostLiveControlChallenge(request({ qr_id: QR }), db, PROFILE);

    const url = `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/live-control/challenges?qr_id=${QR}`;
    const first = await handleGetPendingLiveControlChallenge(
      new Request(url),
      db,
      PROFILE
    );
    const etag = first.headers.get("ETag");
    expect(etag).toBeTruthy();

    const second = await handleGetPendingLiveControlChallenge(
      new Request(url, { headers: { "If-None-Match": etag! } }),
      db,
      PROFILE
    );
    expect(second.status).toBe(304);
    expect(second.headers.get("Cache-Control")).toContain("max-age=15");
  });

  it("returns 404 when no pending challenge exists for a QR", async () => {
    const owner = await getTestKeypair();
    const db = dbFor({ card: card(owner.publicKeyBase58), qr: qr() });

    const pendingRes = await handleGetPendingLiveControlChallenge(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/live-control/challenges?qr_id=${QR}`
      ),
      db,
      PROFILE
    );

    expect(pendingRes.status).toBe(404);
  });

  it("does not create a challenge for a revoked QR", async () => {
    const owner = await getTestKeypair();
    const db = dbFor({
      card: card(owner.publicKeyBase58),
      qr: qr({ status: "revoked" }),
    });

    const res = await handlePostLiveControlChallenge(
      request({ qr_id: QR }),
      db,
      PROFILE
    );
    const json = (await res.json()) as { error: string };

    expect(res.status).toBe(409);
    expect(json.error).toBe("LIVE_CONTROL_UNAVAILABLE");
  });

  it("accepts an owner-signed response and reports proven status", async () => {
    const owner = await getTestKeypair();
    const db = dbFor({ card: card(owner.publicKeyBase58), qr: qr() });
    const challengeRes = await handlePostLiveControlChallenge(
      request({ qr_id: QR }),
      db,
      PROFILE
    );
    const challenge = (await challengeRes.json()) as { challenge_id: string };
    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          qr_id: QR,
          challenge_id: challenge.challenge_id,
          signed_at: "2026-05-16T17:00:00.000Z",
        },
        PAYLOAD_TYPES.LIVE_CONTROL_RESPONSE
      ),
      { privateKey: owner.privateKey, publicKeyBase58: owner.publicKeyBase58 }
    );

    const responseRes = await handlePostLiveControlResponse(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/live-control/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: signed }),
        }
      ),
      db,
      PROFILE
    );
    const responseJson = (await responseRes.json()) as { status: string; message: string };

    expect(responseRes.status).toBe(200);
    expect(responseJson.status).toBe("proven");
    expect(responseJson.message).toContain("does not prove legal identity");

    const statusRes = await handleGetLiveControlChallenge(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/live-control/challenges/${challenge.challenge_id}`
      ),
      db,
      PROFILE,
      challenge.challenge_id
    );
    expect(((await statusRes.json()) as { status: string }).status).toBe("proven");
  });

  it("rejects a response signed by an unrelated key", async () => {
    const owner = await getTestKeypair();
    const other = await randomKeypair();
    const db = dbFor({ card: card(owner.publicKeyBase58), qr: qr() });
    const challengeRes = await handlePostLiveControlChallenge(
      request({ qr_id: QR }),
      db,
      PROFILE
    );
    const challenge = (await challengeRes.json()) as { challenge_id: string };
    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          qr_id: QR,
          challenge_id: challenge.challenge_id,
          signed_at: "2026-05-16T17:00:00.000Z",
        },
        PAYLOAD_TYPES.LIVE_CONTROL_RESPONSE
      ),
      { privateKey: other.privateKey, publicKeyBase58: other.publicKeyBase58 }
    );

    const res = await handlePostLiveControlResponse(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/live-control/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: signed }),
        }
      ),
      db,
      PROFILE
    );

    expect(res.status).toBe(401);
  });
});
