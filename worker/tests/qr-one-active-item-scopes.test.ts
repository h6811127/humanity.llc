import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { handlePostIssueChildObjectQr } from "../src/resolver/issue-child-object-qr";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OBJECT_ID = "obj_status_plate_race1";
const CREATED = "2026-05-16T17:00:00.000Z";
const QR_A = "qr_8Yk9nQ3oR5sU7wX9zA2bC3dE6fG";
const QR_B = "qr_9Zk1nQ4oR6sU8wX2zA3bC4dE7fH";

const repoRoot = join(import.meta.dirname, "../..");

describe("one-active item-scoped QR indexes", () => {
  it("ships migration + rebuild SQL for child_object and print_artifact", () => {
    const migration = readFileSync(
      join(repoRoot, "worker/migrations/0038_qr_one_active_item_scopes.sql"),
      "utf8"
    );
    expect(migration).toContain("idx_qr_one_active_child_object");
    expect(migration).toContain("idx_qr_one_active_print_artifact");
    expect(migration).toContain("scope = 'child_object'");
    expect(migration).toContain("scope = 'print_artifact'");

    const rebuild = readFileSync(
      join(repoRoot, "worker/scripts/child-object-qr-schema-rebuild.sql"),
      "utf8"
    );
    expect(rebuild).toContain("idx_qr_one_active_child_object");
    expect(rebuild).toContain("idx_qr_one_active_print_artifact");
  });

  it("maps unique-index races on a second active child QR to CHILD_OBJECT_QR_ACTIVE", async () => {
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const activeByObject = new Map<string, string>([[OBJECT_ID, QR_A]]);

    const db = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => {
            if (sql.includes("FROM cards WHERE profile_id") && sql.includes("manifesto_line")) {
              return {
                public_key: publicKeyBase58,
                recovery_public_key: null,
                handle: "river_example",
                handle_normalized: "river_example",
                manifesto_line: "Open studio",
                status: "active",
                card_document_json: "{}",
                created_at: CREATED,
                updated_at: CREATED,
              };
            }
            if (sql.includes("FROM child_objects WHERE object_id")) {
              return {
                object_id: OBJECT_ID,
                parent_profile_id: PROFILE,
                object_type: "status_plate",
                public_label: "Door",
                public_state: "Open",
                status: "active",
                child_object_document_json: "{}",
                created_at: CREATED,
                updated_at: CREATED,
              };
            }
            if (sql.includes("object_id = ?") && sql.includes("scope = 'child_object'")) {
              // Simulate TOCTOU: first check sees no active row (race), insert hits unique index.
              if (sql.includes("SELECT qr_id") && !activeByObject.has(String(args[1]))) {
                return null;
              }
              const qrId = activeByObject.get(String(args[1]));
              return qrId ? { qr_id: qrId, object_id: String(args[1]) } : null;
            }
            if (sql.includes("issuer_public_key")) {
              return {
                public_key: publicKeyBase58,
                recovery_public_key: null,
                issuer_public_key: null,
                status: "active",
              };
            }
            return null;
          },
          run: async () => {
            if (sql.includes("INSERT INTO qr_credentials")) {
              // Race: another mint already claimed the active slot.
              throw new Error(
                "UNIQUE constraint failed: idx_qr_one_active_child_object"
              );
            }
            return { success: true };
          },
        }),
      }),
    } as unknown as D1Database;

    // Clear map so pre-insert getActiveChildObjectQr returns null (TOCTOU window).
    activeByObject.clear();
    // Re-seed so post-unique failure re-read finds the winner.
    const restore = () => {
      activeByObject.set(OBJECT_ID, QR_A);
    };

    const issuedAt = "2026-05-18T10:00:00.000Z";
    const payload = `https://humanity.llc/c/${PROFILE}?q=${QR_B}`;
    const qr_credential = await signDocument(
      withProtocolFields(
        {
          qr_id: QR_B,
          profile_id: PROFILE,
          object_id: OBJECT_ID,
          nonce: "nonce_childRace001",
          epoch: 1,
          scope: "child_object",
          resolver_hint: "https://humanity.llc",
          issued_at: issuedAt,
          expires_at: null,
          status: "active",
          payload,
        },
        PAYLOAD_TYPES.QR_CREDENTIAL
      ),
      { privateKey, publicKeyBase58 }
    );

    // Wrap prepare.run so the unique failure path can observe the concurrent winner.
    const originalPrepare = db.prepare.bind(db);
    db.prepare = ((sql: string) => {
      const stmt = originalPrepare(sql);
      const originalBind = stmt.bind.bind(stmt);
      return {
        bind: (...args: unknown[]) => {
          const bound = originalBind(...args);
          if (sql.includes("INSERT INTO qr_credentials")) {
            return {
              ...bound,
              run: async () => {
                restore();
                throw new Error(
                  "UNIQUE constraint failed: idx_qr_one_active_child_object"
                );
              },
            };
          }
          return bound;
        },
      };
    }) as typeof db.prepare;

    const res = await handlePostIssueChildObjectQr(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/objects/${OBJECT_ID}/issue-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr_credential }),
        }
      ),
      db,
      PROFILE,
      OBJECT_ID
    );

    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("CHILD_OBJECT_QR_ACTIVE");
  });
});
