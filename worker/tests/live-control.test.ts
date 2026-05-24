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
  handlePostLiveControlChallenge,
  handlePostLiveControlResponse,
} from "../src/resolver/live-control";
import type { LiveControlChallengeRow } from "../src/db/live-control";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const LIVE_CHALLENGE = "lc_7Xk9mP2nQ4rT6vW8";
const SIGNED_AT = "2026-05-16T17:00:00.000Z";

interface SigningKeypair {
  privateKey: Uint8Array;
  publicKeyBase58: string;
}

type CardWithControlKeys = CardRow & {
  recovery_public_key?: string | null;
  issuer_public_key?: string | null;
};

async function randomKeypair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return { privateKey, publicKeyBase58: encodeBase58(publicKey) };
}

function card(
  publicKey: string,
  overrides: Partial<CardWithControlKeys> = {}
): CardWithControlKeys {
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

function challenge(
  overrides: Partial<LiveControlChallengeRow> = {}
): LiveControlChallengeRow {
  return {
    challenge_id: LIVE_CHALLENGE,
    profile_id: PROFILE,
    qr_id: QR,
    nonce: "nonce",
    verifier_session_id: "verifier",
    status: "pending",
    issued_at: SIGNED_AT,
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    proven_at: null,
    signer_public_key: null,
    response_document_json: null,
    created_at: SIGNED_AT,
    updated_at: SIGNED_AT,
    ...overrides,
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

function responseRequest(response: unknown): Request {
  return new Request(
    `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/live-control/responses`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    }
  );
}

async function signedLiveControlResponse(
  keypair: SigningKeypair,
  challengeId: string
) {
  return signDocument(
    withProtocolFields(
      {
        profile_id: PROFILE,
        qr_id: QR,
        challenge_id: challengeId,
        signed_at: SIGNED_AT,
      },
      PAYLOAD_TYPES.LIVE_CONTROL_RESPONSE
    ),
    keypair
  );
}

function dbFor(rows: {
  card: CardWithControlKeys;
  qr: QrCredentialRow;
  verification?: VerificationSummaryRow | null;
  challenges?: LiveControlChallengeRow[];
}): D1Database {
  const challenges: Record<string, Record<string, unknown>> = Object.fromEntries(
    (rows.challenges ?? []).map((row) => [row.challenge_id, { ...row }])
  );
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

  it("accepts a recovery-key-signed response for live control", async () => {
    const owner = await getTestKeypair();
    const recovery = await randomKeypair();
    const db = dbFor({
      card: card(owner.publicKeyBase58, {
        recovery_public_key: recovery.publicKeyBase58,
      }),
      qr: qr(),
    });
    const challengeRes = await handlePostLiveControlChallenge(
      request({ qr_id: QR }),
      db,
      PROFILE
    );
    const created = (await challengeRes.json()) as { challenge_id: string };
    const signed = await signedLiveControlResponse(recovery, created.challenge_id);

    const responseRes = await handlePostLiveControlResponse(
      responseRequest(signed),
      db,
      PROFILE
    );
    const responseJson = (await responseRes.json()) as { status: string };

    expect(responseRes.status).toBe(200);
    expect(responseJson.status).toBe("proven");
  });

  it("rejects a response after the challenge expires", async () => {
    const owner = await getTestKeypair();
    const expiredChallenge = challenge({
      expires_at: "2020-01-01T00:00:00.000Z",
    });
    const db = dbFor({
      card: card(owner.publicKeyBase58),
      qr: qr(),
      challenges: [expiredChallenge],
    });
    const signed = await signedLiveControlResponse(owner, expiredChallenge.challenge_id);

    const responseRes = await handlePostLiveControlResponse(
      responseRequest(signed),
      db,
      PROFILE
    );
    const responseJson = (await responseRes.json()) as { error: string };

    expect(responseRes.status).toBe(410);
    expect(responseJson.error).toBe("LIVE_CONTROL_EXPIRED");

    const statusRes = await handleGetLiveControlChallenge(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/live-control/challenges/${expiredChallenge.challenge_id}`
      ),
      db,
      PROFILE,
      expiredChallenge.challenge_id
    );
    expect(((await statusRes.json()) as { status: string }).status).toBe("expired");
  });

  it("rejects a second response after a challenge is proven", async () => {
    const owner = await getTestKeypair();
    const provenChallenge = challenge({
      status: "proven",
      proven_at: SIGNED_AT,
      signer_public_key: owner.publicKeyBase58,
      response_document_json: "{}",
    });
    const db = dbFor({
      card: card(owner.publicKeyBase58),
      qr: qr(),
      challenges: [provenChallenge],
    });
    const signed = await signedLiveControlResponse(owner, provenChallenge.challenge_id);

    const responseRes = await handlePostLiveControlResponse(
      responseRequest(signed),
      db,
      PROFILE
    );
    const responseJson = (await responseRes.json()) as { error: string };

    expect(responseRes.status).toBe(409);
    expect(responseJson.error).toBe("LIVE_CONTROL_ALREADY_PROVEN");
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
