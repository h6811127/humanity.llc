import { describe, expect, it } from "vitest";

import worker from "../src";
import type { QrCredentialRow } from "../src/db/types";
import {
  handleGetQrMetadata,
  qrCredentialPublicBodyFromRow,
  qrMetadataResponseBody,
} from "../src/resolver/qr-metadata";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const UNKNOWN_QR = "qr_Abcdefghijkmnop";

function qrRow(overrides: Partial<QrCredentialRow> = {}): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 2,
    scope: "print_artifact",
    print_artifact_id: "pa_test_001",
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: "2027-05-16T17:00:00Z",
    credential_document_json: JSON.stringify({
      qr_id: QR,
      signature: { alg: "Ed25519", public_key: "AXBx" },
    }),
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
    ...overrides,
  };
}

function dbFor(qr: QrCredentialRow | null): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (id: string) => ({
        first: async () => {
          if (sql.includes("FROM qr_credentials") && id === qr?.qr_id) {
            return qr;
          }
          return null;
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("qrMetadataResponseBody", () => {
  it("maps row to contract-shaped public fields without handle or manifesto", () => {
    const body = qrMetadataResponseBody(qrRow());
    expect(body.version).toBe("1.0");
    expect(body.resolver.operator).toBe("humanity.llc");
    expect(body.qr).toEqual({
      qr_id: QR,
      profile_id: PROFILE,
      epoch: 2,
      scope: "print_artifact",
      print_artifact_id: "pa_test_001",
      resolver_hint: "https://humanity.llc",
      issued_at: "2026-05-16T17:00:00Z",
      expires_at: "2027-05-16T17:00:00Z",
      status: "active",
      payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
      signature: { alg: "Ed25519", public_key: "AXBx" },
    });
    expect(body.qr).not.toHaveProperty("handle");
  });
});

describe("handleGetQrMetadata (F2-4)", () => {
  it("returns 200 for active QR", async () => {
    const res = await handleGetQrMetadata(
      new Request(`https://humanity.llc/.well-known/hc/v1/qr/${QR}`),
      dbFor(qrRow()),
      QR
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { qr: { status: string; qr_id: string } };
    expect(json.qr.qr_id).toBe(QR);
    expect(json.qr.status).toBe("active");
  });

  it("returns 200 for revoked QR with status revoked", async () => {
    const res = await handleGetQrMetadata(
      new Request(`https://humanity.llc/.well-known/hc/v1/qr/${QR}`),
      dbFor(qrRow({ status: "revoked" })),
      QR
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { qr: { status: string } };
    expect(json.qr.status).toBe("revoked");
  });

  it("returns 404 for unknown qr_id", async () => {
    const res = await handleGetQrMetadata(
      new Request(`https://humanity.llc/.well-known/hc/v1/qr/${UNKNOWN_QR}`),
      dbFor(null),
      UNKNOWN_QR
    );
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("NOT_FOUND");
  });

  it("returns 422 for malformed qr_id", async () => {
    const res = await handleGetQrMetadata(
      new Request("https://humanity.llc/.well-known/hc/v1/qr/not-a-qr"),
      dbFor(null),
      "not-a-qr"
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("INVALID_QR_ID");
  });

  it("routes GET /.well-known/hc/v1/qr/{qr_id} through the Worker dispatcher", async () => {
    const res = await worker.fetch(
      new Request(`https://humanity.llc/.well-known/hc/v1/qr/${QR}`),
      {
        DB: dbFor(qrRow()),
      } as import("../src").Env
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { qr: { profile_id: string } };
    expect(json.qr.profile_id).toBe(PROFILE);
  });
});
