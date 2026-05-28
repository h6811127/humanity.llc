import { describe, expect, it } from "vitest";

import {
  QR_CREDENTIALS_MIGRATION_0023_COLUMNS,
  tableColumnNamesReady,
} from "../src/db/schema-core";
import { schemaReady } from "../src/db/schema";

describe("schema-core", () => {
  it("tableColumnNamesReady requires object_id after migration 0023", () => {
    expect(QR_CREDENTIALS_MIGRATION_0023_COLUMNS).toContain("object_id");
    expect(
      tableColumnNamesReady(
        [{ name: "qr_id" }, { name: "profile_id" }],
        QR_CREDENTIALS_MIGRATION_0023_COLUMNS
      )
    ).toBe(false);
    expect(
      tableColumnNamesReady(
        [{ name: "qr_id" }, { name: "object_id" }],
        QR_CREDENTIALS_MIGRATION_0023_COLUMNS
      )
    ).toBe(true);
  });
});

describe("schemaReady", () => {
  it("returns false when qr_credentials lacks object_id", async () => {
    const db = {
      prepare(sql: string) {
        return {
          bind: () => ({
            async first() {
              if (sql.includes("sqlite_master")) return { n: 7 };
              return null;
            },
          }),
          async all() {
            return {
              results: [{ name: "qr_id" }, { name: "profile_id" }],
            };
          },
        };
      },
    } as unknown as D1Database;

    await expect(schemaReady(db)).resolves.toBe(false);
  });

  it("returns true when tables and object_id column exist", async () => {
    const db = {
      prepare(sql: string) {
        return {
          bind: () => ({
            async first() {
              if (sql.includes("sqlite_master")) return { n: 7 };
              return null;
            },
          }),
          async all() {
            return {
              results: [{ name: "qr_id" }, { name: "object_id" }],
            };
          },
        };
      },
    } as unknown as D1Database;

    await expect(schemaReady(db)).resolves.toBe(true);
  });
});
