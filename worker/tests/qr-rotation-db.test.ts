import { describe, expect, it } from "vitest";

import {
  applyQrRotation,
  getActiveCardScopeQr,
  getMaxCardScopeEpoch,
} from "../src/db/qr-rotation";

const PROFILE_A = "7Xk9mP2nQ4rT6vW8yZ1aB3cD5";
const PROFILE_B = "8Ym2nQ3oR5sU7wX9zA2bC4dE6";
const OLD_QR = "qr_7Xk9mP2nQ4rT6vW8yZ1aB3cD5eF";
const NEW_QR = "qr_8Ym2nQ3oR5sU7wX9zA2bC4dE6fG";
const NEIGHBOR_QR = "qr_9Zn1oR4pS6tV8yY2aB3cD5eF7hH";
const NOW = "2026-08-19T10:00:00.000Z";

type QrRow = {
  qr_id: string;
  profile_id: string;
  epoch: number;
  scope: "card" | "print_artifact";
  status: "active" | "replaced";
  payload: string;
  issued_at: string;
  expires_at: string | null;
  credential_document_json: string;
  created_at: string;
  updated_at: string;
};

type CardRow = {
  profile_id: string;
  status: "active" | "suspended";
  manifesto_line: string;
  card_document_json: string;
  updated_at: string;
};

class QrRotationStore {
  qrs = new Map<string, QrRow>();
  cards = new Map<string, CardRow>();
  failNextBatch = false;

  addQr(row: QrRow): void {
    this.qrs.set(row.qr_id, { ...row });
  }

  addCard(row: CardRow): void {
    this.cards.set(row.profile_id, { ...row });
  }

  execute(sql: string, args: unknown[]): { success: boolean; error?: string; meta: { changes: number } } {
    if (sql.includes("UPDATE qr_credentials SET status = 'replaced'")) {
      const [updatedAt, qrId, profileId] = args as string[];
      const existing = this.qrs.get(qrId);
      if (
        !existing ||
        existing.profile_id !== profileId ||
        existing.status !== "active"
      ) {
        return { success: true, meta: { changes: 0 } };
      }
      this.qrs.set(qrId, { ...existing, status: "replaced", updated_at: updatedAt });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO qr_credentials")) {
      const [
        qrId,
        profileId,
        epoch,
        payload,
        issuedAt,
        expiresAt,
        credentialDocumentJson,
        createdAt,
        updatedAt,
      ] = args as [string, string, number, string, string, string | null, string, string, string];
      this.qrs.set(qrId, {
        qr_id: qrId,
        profile_id: profileId,
        epoch,
        scope: "card",
        status: "active",
        payload,
        issued_at: issuedAt,
        expires_at: expiresAt,
        credential_document_json: credentialDocumentJson,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return { success: true, meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE cards SET manifesto_line")) {
      const [manifestoLine, cardDocumentJson, updatedAt, profileId] = args as string[];
      const card = this.cards.get(profileId);
      if (!card || card.status !== "active") {
        return { success: true, meta: { changes: 0 } };
      }
      this.cards.set(profileId, {
        ...card,
        manifesto_line: manifestoLine,
        card_document_json: cardDocumentJson,
        updated_at: updatedAt,
      });
      return { success: true, meta: { changes: 1 } };
    }
    return { success: true, meta: { changes: 0 } };
  }

  prepare(sql: string) {
    const store = this;
    return {
      bind(...args: unknown[]) {
        return {
          sql,
          args,
          async first<T>() {
            if (sql.includes("scope = 'card' AND status = 'active'")) {
              const profileId = String(args[0]);
              const match = [...store.qrs.values()].find(
                (row) =>
                  row.profile_id === profileId &&
                  row.scope === "card" &&
                  row.status === "active"
              );
              return (match
                ? { qr_id: match.qr_id, epoch: match.epoch, status: match.status }
                : null) as T | null;
            }
            if (sql.includes("MAX(epoch)")) {
              const profileId = String(args[0]);
              const epochs = [...store.qrs.values()]
                .filter((row) => row.profile_id === profileId && row.scope === "card")
                .map((row) => row.epoch);
              return {
                max_epoch: epochs.length ? Math.max(...epochs) : null,
              } as T;
            }
            return null as T | null;
          },
          async run() {
            return store.execute(sql, args);
          },
        };
      },
    };
  }

  async batch(statements: Array<{ sql: string; args: unknown[] }>) {
    if (this.failNextBatch) {
      this.failNextBatch = false;
      return [{ success: false, error: "D1 batch exploded", meta: { changes: 0 } }];
    }
    return statements.map((stmt) => this.execute(stmt.sql, stmt.args));
  }
}

function seedStore(): QrRotationStore {
  const store = new QrRotationStore();
  store.addCard({
    profile_id: PROFILE_A,
    status: "active",
    manifesto_line: "Open studio",
    card_document_json: "{\"v\":1}",
    updated_at: "2026-08-01T00:00:00.000Z",
  });
  store.addCard({
    profile_id: PROFILE_B,
    status: "active",
    manifesto_line: "Neighbor studio",
    card_document_json: "{\"v\":1}",
    updated_at: "2026-08-01T00:00:00.000Z",
  });
  store.addQr({
    qr_id: OLD_QR,
    profile_id: PROFILE_A,
    epoch: 1,
    scope: "card",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE_A}?q=${OLD_QR}`,
    issued_at: "2026-08-01T00:00:00.000Z",
    expires_at: "2027-08-01T00:00:00.000Z",
    credential_document_json: "{\"epoch\":1}",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
  });
  store.addQr({
    qr_id: NEIGHBOR_QR,
    profile_id: PROFILE_B,
    epoch: 4,
    scope: "card",
    status: "active",
    payload: `https://humanity.llc/c/${PROFILE_B}?q=${NEIGHBOR_QR}`,
    issued_at: "2026-08-01T00:00:00.000Z",
    expires_at: null,
    credential_document_json: "{\"epoch\":4}",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
  });
  return store;
}

function rotationParams(
  overrides: Partial<Parameters<typeof applyQrRotation>[1]> = {}
): Parameters<typeof applyQrRotation>[1] {
  return {
    profileId: PROFILE_A,
    manifestoLine: "Rotated studio",
    cardDocumentJson: "{\"v\":2}",
    updatedAt: NOW,
    previousQrId: OLD_QR,
    newQr: {
      qrId: NEW_QR,
      epoch: 2,
      payload: `https://humanity.llc/c/${PROFILE_A}?q=${NEW_QR}`,
      issuedAt: NOW,
      expiresAt: "2027-08-19T10:00:00.000Z",
      credentialDocumentJson: "{\"epoch\":2}",
    },
    ...overrides,
  };
}

describe("qr-rotation D1 helpers", () => {
  it("getActiveCardScopeQr returns only the caller's active card-scope QR", async () => {
    const store = seedStore();
    store.addQr({
      qr_id: "qr_printArtifactScope99",
      profile_id: PROFILE_A,
      epoch: 9,
      scope: "print_artifact",
      status: "active",
      payload: "https://humanity.llc/c/x?q=qr_print",
      issued_at: NOW,
      expires_at: null,
      credential_document_json: "{}",
      created_at: NOW,
      updated_at: NOW,
    });
    const database = store as unknown as D1Database;

    expect(await getActiveCardScopeQr(database, PROFILE_A)).toEqual({
      qr_id: OLD_QR,
      epoch: 1,
      status: "active",
    });
    expect(await getActiveCardScopeQr(database, PROFILE_B)).toEqual({
      qr_id: NEIGHBOR_QR,
      epoch: 4,
      status: "active",
    });
    expect(await getActiveCardScopeQr(database, "missingProfileId0000001")).toBeNull();
  });

  it("getActiveCardScopeQr ignores replaced card-scope credentials", async () => {
    const store = seedStore();
    store.qrs.get(OLD_QR)!.status = "replaced";
    const database = store as unknown as D1Database;
    expect(await getActiveCardScopeQr(database, PROFILE_A)).toBeNull();
  });

  it("getMaxCardScopeEpoch includes replaced card-scope epochs and ignores other profiles", async () => {
    const store = seedStore();
    store.addQr({
      qr_id: "qr_replacedEpochThree01",
      profile_id: PROFILE_A,
      epoch: 3,
      scope: "card",
      status: "replaced",
      payload: "https://humanity.llc/c/x?q=qr_old",
      issued_at: NOW,
      expires_at: null,
      credential_document_json: "{}",
      created_at: NOW,
      updated_at: NOW,
    });
    const database = store as unknown as D1Database;

    expect(await getMaxCardScopeEpoch(database, PROFILE_A)).toBe(3);
    expect(await getMaxCardScopeEpoch(database, PROFILE_B)).toBe(4);
    expect(await getMaxCardScopeEpoch(database, "missingProfileId0000001")).toBe(0);
  });

  it("applyQrRotation replaces the previous QR, inserts the new card QR, and updates the card", async () => {
    const store = seedStore();
    const database = store as unknown as D1Database;

    await applyQrRotation(database, rotationParams());

    expect(store.qrs.get(OLD_QR)?.status).toBe("replaced");
    expect(store.qrs.get(NEW_QR)).toMatchObject({
      profile_id: PROFILE_A,
      epoch: 2,
      scope: "card",
      status: "active",
      payload: `https://humanity.llc/c/${PROFILE_A}?q=${NEW_QR}`,
    });
    expect(store.cards.get(PROFILE_A)).toMatchObject({
      manifesto_line: "Rotated studio",
      card_document_json: "{\"v\":2}",
      updated_at: NOW,
    });
    expect(store.qrs.get(NEIGHBOR_QR)?.status).toBe("active");
    expect(store.cards.get(PROFILE_B)?.manifesto_line).toBe("Neighbor studio");
    expect(await getActiveCardScopeQr(database, PROFILE_A)).toEqual({
      qr_id: NEW_QR,
      epoch: 2,
      status: "active",
    });
  });

  it("applyQrRotation does not replace another steward's QR when previousQrId is cross-profile", async () => {
    const store = seedStore();
    const database = store as unknown as D1Database;

    await applyQrRotation(
      database,
      rotationParams({ previousQrId: NEIGHBOR_QR })
    );

    expect(store.qrs.get(NEIGHBOR_QR)?.status).toBe("active");
    expect(store.qrs.get(OLD_QR)?.status).toBe("active");
    expect(store.qrs.get(NEW_QR)?.status).toBe("active");
  });

  it("applyQrRotation throws when the D1 batch reports failure", async () => {
    const store = seedStore();
    store.failNextBatch = true;
    const database = store as unknown as D1Database;

    await expect(applyQrRotation(database, rotationParams())).rejects.toThrow(
      "D1 batch exploded"
    );
    expect(store.qrs.get(OLD_QR)?.status).toBe("active");
    expect(store.qrs.has(NEW_QR)).toBe(false);
    expect(store.cards.get(PROFILE_A)?.manifesto_line).toBe("Open studio");
  });
});
