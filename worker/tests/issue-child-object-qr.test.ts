import { describe, expect, it } from "vitest";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { handlePostIssueChildObjectQr } from "../src/resolver/issue-child-object-qr";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { renderScanPage } from "../src/resolver/scan-html";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OBJECT_ID = "obj_status_plate_scan1";
const CHILD_QR = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";
const CREATED = "2026-05-16T17:00:00.000Z";

function issueMockDb(existing: {
  public_key: string;
  recovery_public_key?: string | null;
  status?: string;
  child?: {
    object_type: string;
    public_label: string;
    public_state: string;
    status: string;
  };
}) {
  const inserted: { qr_id: string; object_id: string; scope: string }[] = [];
  const activeByObject = new Map<string, string>();

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
            if (sql.includes("FROM child_objects WHERE object_id")) {
              if (!existing.child) return null;
              return {
                object_id: OBJECT_ID,
                parent_profile_id: PROFILE,
                object_type: existing.child.object_type,
                public_label: existing.child.public_label,
                public_state: existing.child.public_state,
                status: existing.child.status,
                child_object_document_json: "{}",
                created_at: CREATED,
                updated_at: CREATED,
              };
            }
            if (sql.includes("object_id = ?") && sql.includes("scope = 'child_object'")) {
              const objectId = args[1] as string;
              const qrId = activeByObject.get(objectId);
              return qrId ? { qr_id: qrId, object_id: objectId } : null;
            }
            if (sql.includes("issuer_public_key")) {
              return {
                public_key: existing.public_key,
                recovery_public_key: existing.recovery_public_key ?? null,
                issuer_public_key: null,
                status: existing.status ?? "active",
              };
            }
            return null;
          },
          run: async () => {
            if (sql.includes("INSERT INTO qr_credentials")) {
              inserted.push({
                qr_id: args[0] as string,
                object_id: args[4] as string,
                scope: "child_object",
              });
              activeByObject.set(args[4] as string, args[0] as string);
              return { success: true };
            }
            return { success: true };
          },
        }),
      }),
    } as unknown as D1Database,
    inserted,
    activeByObject,
  };
}

async function signedChildObjectQr(
  keypair: Awaited<ReturnType<typeof getTestKeypair>>,
  opts: { expires_at?: string | null } = {}
) {
  const issuedAt = "2026-05-18T10:00:00.000Z";
  const payload = `https://humanity.llc/c/${PROFILE}?q=${CHILD_QR}`;
  return signDocument(
    withProtocolFields(
      {
        qr_id: CHILD_QR,
        profile_id: PROFILE,
        object_id: OBJECT_ID,
        nonce: "nonce_childObj001",
        epoch: 1,
        scope: "child_object",
        resolver_hint: "https://humanity.llc",
        issued_at: issuedAt,
        expires_at: opts.expires_at ?? null,
        status: "active",
        payload,
      },
      PAYLOAD_TYPES.QR_CREDENTIAL
    ),
    keypair
  );
}

describe("issue-child-object-qr", () => {
  it("mints child_object QR for an active status plate", async () => {
    const keys = await getTestKeypair();
    const { db, inserted } = issueMockDb({
      public_key: keys.publicKeyBase58,
      child: {
        object_type: "status_plate",
        public_label: "Studio door",
        public_state: "Open until 9 PM",
        status: "active",
      },
    });
    const qrCredential = await signedChildObjectQr(keys);

    const res = await handlePostIssueChildObjectQr(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/objects/${OBJECT_ID}/issue-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr_credential: qrCredential }),
        }
      ),
      db,
      PROFILE,
      OBJECT_ID
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { scan_url: string; scope: string; object_id: string };
    expect(body.scope).toBe("child_object");
    expect(body.object_id).toBe(OBJECT_ID);
    expect(body.scan_url).toContain(CHILD_QR);
    expect(inserted).toHaveLength(1);
  });

  it("renders status plate scan HTML from child object state", async () => {
    const keys = await getTestKeypair();
    const vm = buildScanViewModel(
      PROFILE,
      CHILD_QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: keys.publicKeyBase58,
          handle: "river_example",
          handle_normalized: "river_example",
          manifesto_line: "Root manifesto",
          status: "active",
          card_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        qr: {
          qr_id: CHILD_QR,
          profile_id: PROFILE,
          epoch: 1,
          scope: "child_object",
          print_artifact_id: null,
          object_id: OBJECT_ID,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=${CHILD_QR}`,
          issued_at: CREATED,
          expires_at: null,
          credential_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        childObject: {
          object_id: OBJECT_ID,
          parent_profile_id: PROFILE,
          object_type: "status_plate",
          public_label: "Studio door",
          public_state: "Open until 9 PM",
          status: "active",
          child_object_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        verification: {
          profile_id: PROFILE,
          state: "registered",
          level: 1,
          label: "Registered",
          method: "registered",
          vouch_count: 0,
          latest_accepted_vouch_at: null,
          credential_ids_json: "[]",
          summary_document_json: null,
          updated_at: CREATED,
        },
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );

    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(vm.kind).toBe("active");
    expect(html).toContain("Studio door");
    expect(html).toContain("Open until 9 PM");
    expect(html).not.toContain("Root manifesto");
  });

  it("renders lost-item relay scan HTML from child object state", async () => {
    const keys = await getTestKeypair();
    const vm = buildScanViewModel(
      PROFILE,
      CHILD_QR,
      {
        card: {
          profile_id: PROFILE,
          public_key: keys.publicKeyBase58,
          handle: "keys_relay",
          handle_normalized: "keys_relay",
          manifesto_line: "Root manifesto",
          status: "active",
          card_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        qr: {
          qr_id: CHILD_QR,
          profile_id: PROFILE,
          epoch: 1,
          scope: "child_object",
          print_artifact_id: null,
          object_id: OBJECT_ID,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=${CHILD_QR}`,
          issued_at: CREATED,
          expires_at: null,
          credential_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        childObject: {
          object_id: OBJECT_ID,
          parent_profile_id: PROFILE,
          object_type: "lost_item_relay",
          public_label: "House keys",
          public_state: "Lost — contact owner through relay",
          status: "active",
          child_object_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        verification: {
          profile_id: PROFILE,
          state: "registered",
          level: 1,
          label: "Registered",
          method: "registered",
          vouch_count: 0,
          latest_accepted_vouch_at: null,
          credential_ids_json: "[]",
          summary_document_json: null,
          updated_at: CREATED,
        },
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );

    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(vm.kind).toBe("active");
    expect(html).toContain("House keys");
    expect(html).toContain("Lost — contact owner through relay");
    expect(html).not.toContain("Root manifesto");
  });
});
