import { describe, expect, it } from "vitest";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { renderScanPage } from "../src/resolver/scan-html";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const ARTIFACT_QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";
const PA_ID = "pa_test_stk_919";
const CREATED = "2026-05-16T17:00:00.000Z";

function issueMockDb(existing: {
  public_key: string;
  recovery_public_key?: string | null;
  status?: string;
}) {
  const inserted: {
    qr_id: string;
    print_artifact_id: string;
    expires_at: string | null;
    scope: string;
  }[] = [];
  const activeByPa = new Map<string, string>();

  return {
    db: {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => {
            if (sql.includes("FROM cards WHERE profile_id") && sql.includes("manifesto_line")) {
              return {
                public_key: existing.public_key,
                recovery_public_key: existing.recovery_public_key ?? null,
                handle: "river_example",
                handle_normalized: "river_example",
                manifesto_line: "Open studio",
                status: existing.status ?? "active",
                card_document_json: "{}",
                created_at: CREATED,
                updated_at: CREATED,
              };
            }
            if (sql.includes("issuer_public_key")) {
              return {
                public_key: existing.public_key,
                recovery_public_key: existing.recovery_public_key ?? null,
                issuer_public_key: null,
                status: existing.status ?? "active",
              };
            }
            if (sql.includes("print_artifact_id = ?")) {
              const paId = args[1] as string;
              const qrId = activeByPa.get(paId);
              return qrId
                ? { qr_id: qrId, print_artifact_id: paId }
                : null;
            }
            return null;
          },
          run: async () => {
            if (sql.includes("INSERT INTO qr_credentials")) {
              inserted.push({
                qr_id: args[0] as string,
                print_artifact_id: args[3] as string,
                expires_at: null,
                scope: "print_artifact",
              });
              activeByPa.set(args[3] as string, args[0] as string);
              return { success: true };
            }
            return { success: true };
          },
        }),
      }),
    } as unknown as D1Database,
    inserted,
    activeByPa,
  };
}

async function signedPrintArtifactQr(
  publicKeyBase58: string,
  privateKey: Uint8Array,
  opts: { expires_at?: string | null } = {}
) {
  const issuedAt = "2026-05-18T10:00:00.000Z";
  const payload = `https://humanity.llc/c/${PROFILE}?q=${ARTIFACT_QR}`;
  return signDocument(
    withProtocolFields(
      {
        qr_id: ARTIFACT_QR,
        profile_id: PROFILE,
        nonce: "nonce_printArt001",
        epoch: 1,
        scope: "print_artifact",
        print_artifact_id: PA_ID,
        resolver_hint: "https://humanity.llc",
        issued_at: issuedAt,
        expires_at: opts.expires_at ?? null,
        status: "active",
        payload,
      },
      PAYLOAD_TYPES.QR_CREDENTIAL
    ),
    { privateKey, publicKeyBase58 }
  );
}

describe("handlePostIssuePrintArtifactQr", () => {
  it("signed print_artifact credential includes print_artifact_id for verify", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const qr_credential = await signedPrintArtifactQr(publicKeyBase58, privateKey);
    const { verifySignedDocument } = await import("../src/crypto");
    const verified = await verifySignedDocument(qr_credential, {
      expectedType: PAYLOAD_TYPES.QR_CREDENTIAL,
    });
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.unsigned.print_artifact_id).toBe(PA_ID);
      expect(verified.unsigned.scope).toBe("print_artifact");
    }
  });

  it("rejects calendar expires_at on print_artifact", async () => {
    const { handlePostIssuePrintArtifactQr } = await import(
      "../src/resolver/issue-print-artifact-qr"
    );
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const qr_credential = await signedPrintArtifactQr(publicKeyBase58, privateKey, {
      expires_at: "2027-05-18T10:00:00.000Z",
    });
    const { db } = issueMockDb({ public_key: publicKeyBase58 });

    const res = await handlePostIssuePrintArtifactQr(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/print-artifact-qrs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr_credential }),
        }
      ),
      db,
      PROFILE
    );

    expect(res.status).toBe(422);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("ITEM_SCOPED_NO_CALENDAR_EXPIRY");
  });

  it("mints print_artifact with null expires_at and leaves card QR siblings", async () => {
    const { handlePostIssuePrintArtifactQr } = await import(
      "../src/resolver/issue-print-artifact-qr"
    );
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const qr_credential = await signedPrintArtifactQr(publicKeyBase58, privateKey);
    const { db, inserted } = issueMockDb({ public_key: publicKeyBase58 });

    const res = await handlePostIssuePrintArtifactQr(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/print-artifact-qrs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr_credential }),
        }
      ),
      db,
      PROFILE
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      qr_id: string;
      print_artifact_id: string;
      qr_expires_at: string | null;
    };
    expect(json.qr_id).toBe(ARTIFACT_QR);
    expect(json.print_artifact_id).toBe(PA_ID);
    expect(json.qr_expires_at).toBeNull();
    expect(inserted).toHaveLength(1);
    expect(inserted[0]!.expires_at).toBeNull();

    const vm = buildScanViewModel(
      PROFILE,
      ARTIFACT_QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: publicKeyBase58,
          handle: "river_example",
          handle_normalized: "river_example",
          manifesto_line: "Open studio",
          status: "active",
          card_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        qr: {
          qr_id: ARTIFACT_QR,
          profile_id: PROFILE,
          epoch: 1,
          scope: "print_artifact",
          print_artifact_id: PA_ID,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=${ARTIFACT_QR}`,
          issued_at: "2026-05-18T10:00:00.000Z",
          expires_at: null,
          credential_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        verification: null,
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    expect(vm.kind).toBe("active");
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).not.toContain("Valid until");
    expect(html).toContain("No calendar expiry");
  });

  it("rejects duplicate active print_artifact_id", async () => {
    const { handlePostIssuePrintArtifactQr } = await import(
      "../src/resolver/issue-print-artifact-qr"
    );
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const qr_credential = await signedPrintArtifactQr(publicKeyBase58, privateKey);
    const mock = issueMockDb({ public_key: publicKeyBase58 });
    mock.activeByPa.set(PA_ID, "qr_existing");

    const res = await handlePostIssuePrintArtifactQr(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/print-artifact-qrs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr_credential }),
        }
      ),
      mock.db,
      PROFILE
    );

    expect(res.status).toBe(409);
  });
});
