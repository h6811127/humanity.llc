import { describe, expect, it } from "vitest";

import {
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const CREATED = "2026-05-16T17:00:00.000Z";

function mockDb(existing: {
  public_key: string;
  recovery_public_key?: string | null;
  handle?: string;
  manifesto_line?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}) {
  let stored = {
    public_key: existing.public_key,
    recovery_public_key: existing.recovery_public_key ?? null,
    handle: existing.handle ?? "river_example",
    handle_normalized: existing.handle ?? "river_example",
    manifesto_line: existing.manifesto_line ?? "Open studio",
    status: existing.status ?? "active",
    card_document_json: "{}",
    created_at: existing.created_at ?? CREATED,
    updated_at: existing.updated_at ?? CREATED,
  };
  return {
    prepare: (sql: string) => ({
      bind: () => ({
        first: async () => {
          if (sql.includes("FROM cards")) return { ...stored };
          return null;
        },
        run: async () => {
          if (sql.includes("UPDATE cards")) {
            stored = {
              ...stored,
              manifesto_line: "Studio door\nClosed until Monday",
              updated_at: "2026-05-17T12:00:00.000Z",
            };
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true, meta: { changes: 0 } };
        },
      }),
    }),
    get stored() {
      return stored;
    },
  } as unknown as D1Database;
}

describe("handlePostCardUpdate", () => {
  it("rejects unsigned body", async () => {
    const { handlePostCardUpdate } = await import("../src/resolver/update-card");
    const res = await handlePostCardUpdate(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      ),
      {} as D1Database,
      PROFILE
    );
    expect(res.status).toBe(400);
  });

  it("accepts owner-signed manifesto update", async () => {
    const { handlePostCardUpdate } = await import("../src/resolver/update-card");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const updatedAt = "2026-05-17T12:00:00.000Z";
    const manifesto = "Studio door\nClosed until Monday";

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          public_key: publicKeyBase58,
          handle: "river_example",
          manifesto_line: manifesto,
          created_at: CREATED,
          updated_at: updatedAt,
          status: "active",
          verification: {
            level: 1,
            label: "Registered",
            method: "registered",
            verified_at: CREATED,
            vouch_count: 0,
            latest_accepted_vouch_at: null,
          },
          badges: [],
          qr: { active_qr_id: "qr_test", epoch: 1 },
          links: { standards: "https://humanity.llc/standards/v1" },
        },
        PAYLOAD_TYPES.HUMANITY_CARD
      ),
      { privateKey, publicKeyBase58 }
    );

    const db = mockDb({ public_key: publicKeyBase58 });
    const res = await handlePostCardUpdate(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card: signed }),
        }
      ),
      db,
      PROFILE
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { manifesto_line: string };
    expect(json.manifesto_line).toBe(manifesto);
  });

  it("rejects stale updated_at", async () => {
    const { handlePostCardUpdate } = await import("../src/resolver/update-card");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          public_key: publicKeyBase58,
          handle: "river_example",
          manifesto_line: "Same time",
          created_at: CREATED,
          updated_at: CREATED,
          status: "active",
          verification: {
            level: 1,
            label: "Registered",
            method: "registered",
            verified_at: CREATED,
            vouch_count: 0,
            latest_accepted_vouch_at: null,
          },
          badges: [],
          qr: { active_qr_id: "qr_test", epoch: 1 },
          links: {},
        },
        PAYLOAD_TYPES.HUMANITY_CARD
      ),
      { privateKey, publicKeyBase58 }
    );

    const db = mockDb({ public_key: publicKeyBase58, updated_at: CREATED });
    const res = await handlePostCardUpdate(
      new Request(
        `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/update`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card: signed }),
        }
      ),
      db,
      PROFILE
    );
    expect(res.status).toBe(422);
  });
});
