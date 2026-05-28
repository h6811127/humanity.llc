import { describe, expect, it } from "vitest";

import { loadScanContext } from "../src/db/scan";
import type { CardRow, ChildObjectRow, QrCredentialRow } from "../src/db/types";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const QR = "qr_7Xk9mP2nQ4rT6vW8";
const OBJECT_ID = "obj_status_plate_scan1";

function cardRow(): CardRow {
  return {
    profile_id: PROFILE,
    public_key: "pk",
    handle: "river_example",
    handle_normalized: "river_example",
    manifesto_line: "Root manifesto",
    status: "active",
    card_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function childObjectRow(): ChildObjectRow {
  return {
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "status_plate",
    public_label: "Studio door",
    public_state: "Open until 9 PM",
    status: "active",
    child_object_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function childObjectQr(): QrCredentialRow {
  return {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null,
    object_id: OBJECT_ID,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: "2026-05-16T17:00:00Z",
    expires_at: null,
    credential_document_json: "{}",
    created_at: "2026-05-16T17:00:00Z",
    updated_at: "2026-05-16T17:00:00Z",
  };
}

function scanContextDb(child: ChildObjectRow | null) {
  const objects = child ? new Map([[child.object_id, child]]) : new Map();
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM cards")) return cardRow();
          if (sql.includes("FROM qr_credentials")) return childObjectQr();
          if (sql.includes("FROM child_objects")) {
            return objects.get(String(args[0])) ?? null;
          }
          if (sql.includes("FROM verification_summaries")) {
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
          return null;
        },
      }),
    }),
  } as unknown as D1Database;
}

describe("loadScanContext", () => {
  it("loads child object when QR scope is child_object", async () => {
    const row = childObjectRow();
    const ctx = await loadScanContext(scanContextDb(row), PROFILE, QR);
    expect(ctx.childObject).toEqual(row);
  });

  it("omits child object when parent_profile_id mismatches", async () => {
    const row = { ...childObjectRow(), parent_profile_id: "other_profile_id" };
    const ctx = await loadScanContext(scanContextDb(row), PROFILE, QR);
    expect(ctx.childObject).toBeNull();
  });

  it("omits child object for non-child_object QR scope", async () => {
    const db = scanContextDb(childObjectRow());
    const originalPrepare = db.prepare.bind(db);
    db.prepare = (sql: string) => {
      const stmt = originalPrepare(sql);
      return {
        bind: (...args: unknown[]) => ({
          first: async () => {
            if (sql.includes("FROM qr_credentials")) {
              return { ...childObjectQr(), scope: "card", object_id: null };
            }
            return stmt.bind(...args).first();
          },
        }),
      };
    };
    const ctx = await loadScanContext(db, PROFILE, QR);
    expect(ctx.childObject).toBeNull();
  });
});
