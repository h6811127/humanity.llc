import { beforeEach, describe, expect, it, vi } from "vitest";
import * as ed from "@noble/ed25519";

import {
  encodeBase58,
  getTestKeypair,
  PAYLOAD_TYPES,
  signDocument,
  withProtocolFields,
} from "../src/crypto";
import type { LostItemOfferRow } from "../src/live-object/lost-item-offer-core";
import {
  handlePostLostItemOffer,
  handlePostLostItemOfferOwner,
} from "../src/resolver/lost-item-offer";
import { d1WithRateLimitBuckets } from "./rate-limit-db-mock";

const PROFILE = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const OBJECT_ID = "obj_lost_item_relay01";
const QR = "qr_lost_item_relay01";
const CREATED = "2026-06-01T12:00:00.000Z";
const OFFER_ID = "ro_7Xk9mP2nQ4rT6vW8yZ1aB3";

type ObjectRow = {
  object_id: string;
  parent_profile_id: string;
  object_type: string;
  public_label: string;
  public_state: string;
  status: string;
  child_object_document_json: string;
  created_at: string;
  updated_at: string;
};

class LostItemOfferDb {
  parent = {
    public_key: "",
    recovery_public_key: null as string | null,
    status: "active",
  };

  qr = {
    qr_id: QR,
    profile_id: PROFILE,
    epoch: 1,
    scope: "child_object",
    print_artifact_id: null as string | null,
    object_id: OBJECT_ID,
    resolver_hint: "https://humanity.llc",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE}?q=${QR}`,
    issued_at: CREATED,
    expires_at: null as string | null,
    credential_document_json: "{}",
    created_at: CREATED,
    updated_at: CREATED,
  };

  objects = new Map<string, ObjectRow>();
  offers = new Map<string, LostItemOfferRow>();

  prepare(sql: string) {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("FROM cards WHERE profile_id")) {
              return db.parent as T;
            }
            if (sql.includes("FROM child_objects WHERE object_id")) {
              return (db.objects.get(String(args[0])) ?? null) as T | null;
            }
            if (sql.includes("FROM qr_credentials WHERE qr_id")) {
              const id = String(args[0]);
              return id === db.qr.qr_id ? (db.qr as T) : null;
            }
            if (sql.includes("COUNT(*) AS count FROM lost_item_relay_offers")) {
              const objectId = String(args[0]);
              const nowIso = String(args[1]);
              const count = Array.from(db.offers.values()).filter(
                (row) =>
                  row.object_id === objectId &&
                  row.status === "pending" &&
                  row.expires_at > nowIso
              ).length;
              return { count } as T;
            }
            if (
              sql.includes("FROM lost_item_relay_offers WHERE offer_id = ?") &&
              !sql.includes("UPDATE")
            ) {
              return (db.offers.get(String(args[0])) ?? null) as T | null;
            }
            return null as T | null;
          },
          async all<T>() {
            if (sql.includes("FROM lost_item_relay_offers")) {
              const profileId = String(args[0]);
              const objectId = String(args[1]);
              const nowIso = String(args[2]);
              const rows = Array.from(db.offers.values())
                .filter(
                  (row) =>
                    row.parent_profile_id === profileId &&
                    row.object_id === objectId &&
                    row.status === "pending" &&
                    row.expires_at > nowIso
                )
                .sort((a, b) => b.created_at.localeCompare(a.created_at));
              return { results: rows as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (sql.startsWith("INSERT INTO lost_item_relay_offers")) {
              const row: LostItemOfferRow = {
                offer_id: String(args[0]),
                parent_profile_id: String(args[1]),
                object_id: String(args[2]),
                qr_id: args[3] == null ? null : String(args[3]),
                message: String(args[4]),
                status: args[5] as LostItemOfferRow["status"],
                created_at: String(args[6]),
                updated_at: String(args[7]),
                expires_at: String(args[8]),
              };
              db.offers.set(row.offer_id, row);
              return { success: true, meta: { changes: 1 } };
            }
            if (
              sql.includes("UPDATE lost_item_relay_offers") &&
              sql.includes("expires_at <= ?")
            ) {
              const updatedAt = String(args[0]);
              const nowIso = String(args[1]);
              for (const row of db.offers.values()) {
                if (row.status === "pending" && row.expires_at <= nowIso) {
                  row.status = "dismissed";
                  row.updated_at = updatedAt;
                }
              }
              return { success: true, meta: { changes: 1 } };
            }
            if (
              sql.includes("UPDATE lost_item_relay_offers") &&
              sql.includes("WHERE offer_id = ? AND status = 'pending'")
            ) {
              const updatedAt = String(args[0]);
              const offerId = String(args[1]);
              const row = db.offers.get(offerId);
              if (row && row.status === "pending") {
                row.status = "dismissed";
                row.updated_at = updatedAt;
                return { success: true, meta: { changes: 1 } };
              }
              return { success: true, meta: { changes: 0 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }
}

function dbWithRelay(keypair: Awaited<ReturnType<typeof getTestKeypair>>) {
  const inner = new LostItemOfferDb();
  inner.parent.public_key = keypair.publicKeyBase58;
  inner.objects.set(OBJECT_ID, {
    object_id: OBJECT_ID,
    parent_profile_id: PROFILE,
    object_type: "lost_item_relay",
    public_label: "House keys",
    public_state: "Lost — contact owner through relay",
    status: "active",
    child_object_document_json: "{}",
    created_at: CREATED,
    updated_at: CREATED,
  });
  return {
    db: d1WithRateLimitBuckets((sql) => inner.prepare(sql)) as D1Database,
    inner,
  };
}

function finderRequest(body: Record<string, unknown>) {
  return new Request(
    `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/objects/${OBJECT_ID}/offer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "203.0.113.10",
      },
      body: JSON.stringify(body),
    }
  );
}

async function signedOwnerQuery(
  keypair: Awaited<ReturnType<typeof getTestKeypair>>,
  action: "list" | "dismiss",
  overrides: Record<string, unknown> = {}
) {
  return signDocument(
    withProtocolFields(
      {
        profile_id: PROFILE,
        object_id: OBJECT_ID,
        action,
        created_at: CREATED,
        ...(action === "dismiss" ? { offer_id: OFFER_ID } : {}),
        ...overrides,
      },
      PAYLOAD_TYPES.RELAY_OFFER_OWNER_QUERY
    ),
    keypair
  );
}

function ownerRequest(query: Record<string, unknown>) {
  return new Request(
    `https://humanity.llc/.well-known/hc/v1/cards/${PROFILE}/objects/${OBJECT_ID}/offer/owner`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    }
  );
}

describe("lost-item-offer API", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
  });

  it("accepts anonymous finder message on active lost-item relay", async () => {
    const keypair = await getTestKeypair();
    const { db } = dbWithRelay(keypair);
    const res = await handlePostLostItemOffer(
      finderRequest({ message: "Found at the library desk" }),
      db,
      PROFILE,
      OBJECT_ID
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { type: string; offer_id: string };
    expect(body.type).toBe("relay_offer_accepted");
    expect(body.offer_id).toMatch(/^ro_/);
  });

  it("rejects empty message", async () => {
    const keypair = await getTestKeypair();
    const { db } = dbWithRelay(keypair);
    const res = await handlePostLostItemOffer(
      finderRequest({ message: "   " }),
      db,
      PROFILE,
      OBJECT_ID
    );
    expect(res.status).toBe(422);
  });

  it("rejects offer on non-relay child object", async () => {
    const keypair = await getTestKeypair();
    const { db, inner } = dbWithRelay(keypair);
    const row = inner.objects.get(OBJECT_ID)!;
    row.object_type = "status_plate";
    const res = await handlePostLostItemOffer(
      finderRequest({ message: "Hello" }),
      db,
      PROFILE,
      OBJECT_ID
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("NOT_LOST_ITEM_RELAY");
  });

  it("lists pending offers for signed owner query", async () => {
    const keypair = await getTestKeypair();
    const { db, inner } = dbWithRelay(keypair);
    inner.offers.set(OFFER_ID, {
      offer_id: OFFER_ID,
      parent_profile_id: PROFILE,
      object_id: OBJECT_ID,
      qr_id: null,
      message: "On the bench outside",
      status: "pending",
      created_at: CREATED,
      updated_at: CREATED,
      expires_at: "2026-07-01T12:00:00.000Z",
    });

    const query = await signedOwnerQuery(keypair, "list");
    const res = await handlePostLostItemOfferOwner(
      ownerRequest(query),
      db,
      PROFILE,
      OBJECT_ID
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      type: string;
      offers: Array<{ offer_id: string; message: string }>;
    };
    expect(body.type).toBe("relay_offer_list");
    expect(body.offers).toHaveLength(1);
    expect(body.offers[0]?.message).toBe("On the bench outside");
  });

  it("dismisses pending offer for signed owner query", async () => {
    const keypair = await getTestKeypair();
    const { db, inner } = dbWithRelay(keypair);
    inner.offers.set(OFFER_ID, {
      offer_id: OFFER_ID,
      parent_profile_id: PROFILE,
      object_id: OBJECT_ID,
      qr_id: null,
      message: "On the bench outside",
      status: "pending",
      created_at: CREATED,
      updated_at: CREATED,
      expires_at: "2026-07-01T12:00:00.000Z",
    });

    const query = await signedOwnerQuery(keypair, "dismiss");
    const res = await handlePostLostItemOfferOwner(
      ownerRequest(query),
      db,
      PROFILE,
      OBJECT_ID
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { type: string; status: string };
    expect(body.type).toBe("relay_offer_dismissed");
    expect(body.status).toBe("dismissed");
    expect(inner.offers.get(OFFER_ID)?.status).toBe("dismissed");
  });

  it("rejects owner query signed by non-owner key", async () => {
    const owner = await getTestKeypair();
    const strangerPrivate = ed.utils.randomPrivateKey();
    const strangerPublic = await ed.getPublicKeyAsync(strangerPrivate);
    const stranger = {
      privateKey: strangerPrivate,
      publicKey: strangerPublic,
      publicKeyBase58: encodeBase58(strangerPublic),
    };
    const { db } = dbWithRelay(owner);
    const query = await signedOwnerQuery(stranger, "list", {
      profile_id: PROFILE,
      object_id: OBJECT_ID,
    });
    const res = await handlePostLostItemOfferOwner(
      ownerRequest(query),
      db,
      PROFILE,
      OBJECT_ID
    );
    expect(res.status).toBe(401);
  });
});
