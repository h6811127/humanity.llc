import { describe, expect, it } from "vitest";

import * as ed from "@noble/ed25519";

import {
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import { renderScanPage } from "../src/resolver/scan-html";
import { buildScanViewModel } from "../src/resolver/scan-state";

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
      bind: (...args: unknown[]) => ({
        first: async () => {
          if (sql.includes("FROM cards")) return { ...stored };
          return null;
        },
        run: async () => {
          if (sql.includes("UPDATE cards")) {
            if (
              sql.includes("AND updated_at = ?") &&
              String(args[4]) !== stored.updated_at
            ) {
              return { success: true, meta: { changes: 0 } };
            }
            stored = {
              ...stored,
              manifesto_line: String(args[0] ?? stored.manifesto_line),
              card_document_json: String(args[1] ?? stored.card_document_json),
              updated_at: String(args[2] ?? "2026-05-17T12:00:00.000Z"),
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
    /** Test helper: advance stored updated_at as if a concurrent writer won. */
    bumpUpdatedAt(iso: string) {
      stored = { ...stored, updated_at: iso };
    },
  } as unknown as D1Database & { bumpUpdatedAt(iso: string): void };
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

  it("rejects stale card updates that would rewind updated_at", async () => {
    const { handlePostCardUpdate } = await import("../src/resolver/update-card");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const staleUpdatedAt = "2026-05-17T12:00:00.000Z";
    const manifesto = "Stale manifesto\nShould not win";

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          public_key: publicKeyBase58,
          handle: "river_example",
          manifesto_line: manifesto,
          created_at: CREATED,
          updated_at: staleUpdatedAt,
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
    // Concurrent writer already advanced the row past the stale client's base.
    db.bumpUpdatedAt("2026-05-17T13:00:00.000Z");

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

    // Pre-check rejects updated_at <= stored before CAS runs.
    expect(res.status).toBe(422);
    expect(db.stored.updated_at).toBe("2026-05-17T13:00:00.000Z");
  });

  it("returns UPDATE_CONFLICT when CAS loses a race after the freshness check", async () => {
    const { applyCardUpdate } = await import("../src/db/card-update");
    const db = mockDb({
      public_key: "pk",
      updated_at: "2026-05-17T12:00:00.000Z",
    });
    db.bumpUpdatedAt("2026-05-17T13:00:00.000Z");
    await expect(
      applyCardUpdate(
        db,
        PROFILE,
        "Lost write",
        "{}",
        "2026-05-17T12:30:00.000Z",
        "2026-05-17T12:00:00.000Z"
      )
    ).rejects.toThrow("CARD_UPDATE_CONFLICT");
    expect(db.stored.updated_at).toBe("2026-05-17T13:00:00.000Z");
  });

  it("accepts owner-signed update with object_streams", async () => {
    const { handlePostCardUpdate } = await import("../src/resolver/update-card");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const updatedAt = "2026-05-17T12:00:00.000Z";
    const manifesto = "Community garden\nOpen · volunteers welcome";
    const objectStreams = [
      { id: "tasks", class: "care", label: "Today's tasks", value: "Water bed 3" },
    ];

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          public_key: publicKeyBase58,
          handle: "river_example",
          manifesto_line: manifesto,
          object_streams: objectStreams,
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
          links: {},
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
    const body = (await res.json()) as { object_streams?: typeof objectStreams };
    expect(body.object_streams).toEqual(objectStreams);
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

  it("rejects update when card is suspended", async () => {
    const { handlePostCardUpdate } = await import("../src/resolver/update-card");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const updatedAt = "2026-05-17T12:00:00.000Z";

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          public_key: publicKeyBase58,
          handle: "river_example",
          manifesto_line: "New line",
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
          links: {},
        },
        PAYLOAD_TYPES.HUMANITY_CARD
      ),
      { privateKey, publicKeyBase58 }
    );

    const db = mockDb({ public_key: publicKeyBase58, status: "suspended" });
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
    expect(res.status).toBe(410);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("CARD_SUSPENDED");
  });

  it("rejects update signed by wrong key", async () => {
    const { handlePostCardUpdate } = await import("../src/resolver/update-card");
    const owner = await getTestKeypair();
    const strangerPrivate = ed.utils.randomPrivateKey();
    const strangerPublicKeyBase58 = encodeBase58(
      await ed.getPublicKeyAsync(strangerPrivate)
    );

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          public_key: owner.publicKeyBase58,
          handle: "river_example",
          manifesto_line: "Hijack attempt",
          created_at: CREATED,
          updated_at: "2026-05-17T12:00:00.000Z",
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
      { privateKey: strangerPrivate, publicKeyBase58: owner.publicKeyBase58 }
    );

    const db = mockDb({ public_key: owner.publicKeyBase58 });
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
    expect(res.status).toBe(401);
  });

  it("rejects update when card is revoked", async () => {
    const { handlePostCardUpdate } = await import("../src/resolver/update-card");
    const { privateKey, publicKeyBase58 } = await getTestKeypair();
    const updatedAt = "2026-05-17T12:00:00.000Z";

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          public_key: publicKeyBase58,
          handle: "river_example",
          manifesto_line: "Too late",
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
          links: {},
        },
        PAYLOAD_TYPES.HUMANITY_CARD
      ),
      { privateKey, publicKeyBase58 }
    );

    const db = mockDb({ public_key: publicKeyBase58, status: "revoked" });
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
    expect(res.status).toBe(410);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("CARD_REVOKED");
  });

  it("accepts recovery-key-signed manifesto update", async () => {
    const { handlePostCardUpdate } = await import("../src/resolver/update-card");
    const owner = await getTestKeypair();
    const recovery = await getTestKeypair();
    const updatedAt = "2026-05-17T12:00:00.000Z";
    const manifesto = "[relay] House keys\nFound - thank you";

    const signed = await signDocument(
      withProtocolFields(
        {
          profile_id: PROFILE,
          public_key: owner.publicKeyBase58,
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
      { privateKey: recovery.privateKey, publicKeyBase58: recovery.publicKeyBase58 }
    );

    const db = mockDb({
      public_key: owner.publicKeyBase58,
      recovery_public_key: recovery.publicKeyBase58,
    });
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
  });

  it("scan HTML reflects updated lost-item relay manifesto", async () => {
    const manifesto = "[relay] House keys\nFound - thank you";
    const vm = buildScanViewModel(
      PROFILE,
      "qr_test",
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "river_example",
          handle_normalized: "river_example",
          manifesto_line: manifesto,
          status: "active",
          card_document_json: "{}",
          created_at: CREATED,
          updated_at: "2026-05-17T12:00:00.000Z",
        },
        qr: {
          qr_id: "qr_test",
          profile_id: PROFILE,
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=qr_test`,
          issued_at: CREATED,
          expires_at: "2027-05-16T12:00:00.000Z",
          credential_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        verification: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("House keys");
    expect(html).toContain("Found - thank you");
    expect(html).not.toContain("[relay]");
  });

  it("scan HTML reflects updated two-line status plate manifesto", async () => {
    const manifesto = "Studio door\nClosed until Monday";
    const vm = buildScanViewModel(
      PROFILE,
      "qr_test",
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "river_example",
          handle_normalized: "river_example",
          manifesto_line: manifesto,
          status: "active",
          card_document_json: "{}",
          created_at: CREATED,
          updated_at: "2026-05-17T12:00:00.000Z",
        },
        qr: {
          qr_id: "qr_test",
          profile_id: PROFILE,
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=qr_test`,
          issued_at: CREATED,
          expires_at: "2027-05-16T12:00:00.000Z",
          credential_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        verification: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("Closed until Monday");
    expect(html).toContain("Studio door");
  });

  it("scan HTML reflects updated object_streams on status plate", async () => {
    const streams = [
      { id: "note", class: "place", label: "Special hours", value: "Closed Friday" },
    ];
    const vm = buildScanViewModel(
      PROFILE,
      "qr_test",
      {
        card: {
          profile_id: PROFILE,
          public_key: "pk",
          handle: "river_example",
          handle_normalized: "river_example",
          manifesto_line: "Studio door\nOpen · Thu–Sun until 9 PM",
          status: "active",
          card_document_json: JSON.stringify({ object_streams: streams }),
          created_at: CREATED,
          updated_at: "2026-05-17T12:00:00.000Z",
        },
        qr: {
          qr_id: "qr_test",
          profile_id: PROFILE,
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: `https://humanity.llc/c/${PROFILE}?q=qr_test`,
          issued_at: CREATED,
          expires_at: "2027-05-16T12:00:00.000Z",
          credential_document_json: "{}",
          created_at: CREATED,
          updated_at: CREATED,
        },
        verification: null,
      },
      "https://humanity.llc"
    );
    const html = await renderScanPage(vm, "https://humanity.llc");
    expect(html).toContain("scan-object-streams");
    expect(html).toContain("Special hours");
    expect(html).toContain("Closed Friday");
  });
});
