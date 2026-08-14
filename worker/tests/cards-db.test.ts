import { describe, expect, it } from "vitest";

import {
  getCardByProfileId,
  getCardStatusByProfileId,
  handleExists,
  insertCardWithQr,
  profileIdExists,
} from "../src/db/cards";
import { DEFAULT_REGISTERED_SUMMARY } from "../src/db/types";

const PROFILE = "nSVXWPqgRFEhGPjxyRzidF6s";
const HANDLE = "AdaLovelace";
const HANDLE_NORM = "adalovelace";

type CardRow = {
  profile_id: string;
  public_key: string;
  recovery_public_key: string | null;
  issuer_public_key: string | null;
  handle: string;
  handle_normalized: string;
  manifesto_line: string;
  status: string;
  card_document_json: string;
  created_at: string;
  updated_at: string;
};

type SummaryRow = {
  profile_id: string;
  state: string;
  level: number;
  label: string;
  method: string;
  vouch_count: number;
  latest_accepted_vouch_at: string | null;
  credential_ids_json: string;
  updated_at: string;
};

type QrRow = {
  qr_id: string;
  profile_id: string;
  epoch: number;
  scope: string;
  print_artifact_id: string | null;
  status: string;
  payload: string;
  issued_at: string;
  expires_at: string | null;
  credential_document_json: string;
};

class FakeCardsDb {
  cards: CardRow[] = [];
  summaries: SummaryRow[] = [];
  qrs: QrRow[] = [];
  failBatch = false;

  prepare(sql: string) {
    const self = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (sql.includes("SELECT 1 FROM cards WHERE profile_id")) {
              return (self.cards.some((row) => row.profile_id === args[0])
                ? { 1: 1 }
                : null) as T | null;
            }
            if (sql.includes("SELECT 1 FROM cards WHERE handle_normalized")) {
              return (self.cards.some((row) => row.handle_normalized === args[0])
                ? { 1: 1 }
                : null) as T | null;
            }
            if (sql.includes("SELECT card_document_json FROM cards")) {
              const row = self.cards.find((c) => c.profile_id === args[0]);
              return (row ? { card_document_json: row.card_document_json } : null) as T | null;
            }
            if (sql.includes("SELECT status FROM cards")) {
              const row = self.cards.find((c) => c.profile_id === args[0]);
              return (row ? { status: row.status } : null) as T | null;
            }
            return null;
          },
          async run() {
            if (self.failBatch) {
              return { success: false, error: "batch insert failed", meta: { changes: 0 } };
            }
            if (sql.includes("INSERT INTO cards")) {
              self.cards.push({
                profile_id: String(args[0]),
                public_key: String(args[1]),
                recovery_public_key: (args[2] as string | null) ?? null,
                issuer_public_key: (args[3] as string | null) ?? null,
                handle: String(args[4]),
                handle_normalized: String(args[5]),
                manifesto_line: String(args[6]),
                status: "active",
                card_document_json: String(args[7]),
                created_at: String(args[8]),
                updated_at: String(args[9]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO verification_summaries")) {
              self.summaries.push({
                profile_id: String(args[0]),
                state: String(args[1]),
                level: Number(args[2]),
                label: String(args[3]),
                method: String(args[4]),
                vouch_count: Number(args[5]),
                latest_accepted_vouch_at: (args[6] as string | null) ?? null,
                credential_ids_json: String(args[7]),
                updated_at: String(args[8]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            if (sql.includes("INSERT INTO qr_credentials")) {
              self.qrs.push({
                qr_id: String(args[0]),
                profile_id: String(args[1]),
                epoch: 1,
                scope: "card",
                print_artifact_id: null,
                status: "active",
                payload: String(args[2]),
                issued_at: String(args[3]),
                expires_at: (args[4] as string | null) ?? null,
                credential_document_json: String(args[5]),
              });
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          },
        };
      },
    };
  }

  async batch(stmts: { run: () => Promise<{ success: boolean; error?: string }> }[]) {
    const results = [];
    for (const stmt of stmts) {
      results.push(await stmt.run());
    }
    return results;
  }
}

function db(fake: FakeCardsDb): D1Database {
  return fake as unknown as D1Database;
}

describe("cards db uniqueness and create batch", () => {
  it("reports missing vs existing profile and handle", async () => {
    const fake = new FakeCardsDb();
    expect(await profileIdExists(db(fake), PROFILE)).toBe(false);
    expect(await handleExists(db(fake), HANDLE_NORM)).toBe(false);

    fake.cards.push({
      profile_id: PROFILE,
      public_key: "pk",
      recovery_public_key: null,
      issuer_public_key: null,
      handle: HANDLE,
      handle_normalized: HANDLE_NORM,
      manifesto_line: "hello",
      status: "active",
      card_document_json: '{"card":true}',
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    });

    expect(await profileIdExists(db(fake), PROFILE)).toBe(true);
    expect(await handleExists(db(fake), HANDLE_NORM)).toBe(true);
    expect(await handleExists(db(fake), "otherhandle")).toBe(false);
    expect(await getCardByProfileId(db(fake), PROFILE)).toEqual({
      card_document_json: '{"card":true}',
    });
    expect(await getCardStatusByProfileId(db(fake), PROFILE)).toEqual({ status: "active" });
    expect(await getCardStatusByProfileId(db(fake), "missingProfileId123")).toBeNull();
  });

  it("inserts card, registered summary, and card-scope QR in one batch", async () => {
    const fake = new FakeCardsDb();
    await insertCardWithQr(
      db(fake),
      {
        profileId: PROFILE,
        publicKey: "pk_owner",
        recoveryPublicKey: "pk_recovery",
        issuerPublicKey: "pk_issuer",
        handle: HANDLE,
        handleNormalized: HANDLE_NORM,
        manifestoLine: "live object",
        cardDocumentJson: '{"ok":true}',
        createdAt: "2026-08-14T10:00:00.000Z",
      },
      {
        qrId: "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        payload: "https://humanity.llc/c/nSVXWPqgRFEhGPjxyRzidF6s?q=qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
        issuedAt: "2026-08-14T10:00:00.000Z",
        expiresAt: null,
        credentialDocumentJson: '{"qr":true}',
      }
    );

    expect(fake.cards).toHaveLength(1);
    expect(fake.cards[0]).toMatchObject({
      profile_id: PROFILE,
      status: "active",
      handle_normalized: HANDLE_NORM,
      recovery_public_key: "pk_recovery",
    });
    expect(fake.summaries[0]).toMatchObject({
      profile_id: PROFILE,
      ...DEFAULT_REGISTERED_SUMMARY,
    });
    expect(fake.qrs[0]).toMatchObject({
      qr_id: "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      profile_id: PROFILE,
      scope: "card",
      print_artifact_id: null,
      status: "active",
      expires_at: null,
    });
  });

  it("throws when any create-batch statement fails", async () => {
    const fake = new FakeCardsDb();
    fake.failBatch = true;
    await expect(
      insertCardWithQr(
        db(fake),
        {
          profileId: PROFILE,
          publicKey: "pk",
          handle: HANDLE,
          handleNormalized: HANDLE_NORM,
          manifestoLine: "x",
          cardDocumentJson: "{}",
          createdAt: "2026-08-14T10:00:00.000Z",
        },
        {
          qrId: "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          payload: "https://humanity.llc/c/x?q=qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          issuedAt: "2026-08-14T10:00:00.000Z",
          expiresAt: null,
          credentialDocumentJson: "{}",
        }
      )
    ).rejects.toThrow("batch insert failed");
    expect(fake.cards).toHaveLength(0);
  });
});
