import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDocketEditProposalStoreDocument,
  docketEditProposalsStorePath,
  validateDocketEditProposalStoreDocument,
} from "../../site/js/docket-edit-proposal-store-core.mjs";
import {
  createDocketEditProposalSigned,
  approveDocketEditProposalSigned,
} from "../../site/js/docket-edit-proposal-sign-core.mjs";
import {
  handleGetDocketEditProposals,
  handlePutDocketEditProposals,
} from "../src/resolver/docket-edit-proposals";
import { assessWsDocketDgStorePreflight } from "../scripts/ws-docket-dg-store-preflight-core.mjs";
import {
  buildWsDocketDgStoreKitHtml,
  validateWsDocketDgStoreKitHtml,
} from "../scripts/ws-docket-dg-store-kit-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const stewards = [
  { id: "hc-founders", display_name: "Founders" },
  { id: "hc-reviewer", display_name: "Reviewer" },
];

class DocketStoreDb {
  rows = new Map();

  prepare(sql) {
    const db = this;
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM docket_edit_proposal_stores")) {
              return db.rows.get(String(args[0])) ?? null;
            }
            return null;
          },
          async run() {
            if (sql.includes("INSERT INTO docket_edit_proposal_stores")) {
              const caseId = String(args[0]);
              const existing = db.rows.get(caseId);
              db.rows.set(caseId, {
                case_id: caseId,
                proposals_json: String(args[1]),
                updated_at: String(args[2]),
                created_at: existing?.created_at ?? String(args[3]),
              });
            }
            return { success: true };
          },
        };
      },
    };
  }
}

describe("docket-edit-proposal-store-core (DG-store-v0)", () => {
  it("builds and validates a store document that never writes published JSON", () => {
    const doc = buildDocketEditProposalStoreDocument({
      caseId: "altman",
      proposals: [],
      updatedAt: "2026-07-16T12:00:00.000Z",
    });
    expect(validateDocketEditProposalStoreDocument(doc).ok).toBe(true);
    expect(doc.writes_published_json).toBe(false);
    expect(doc.worker_store).toBe(true);
    expect(docketEditProposalsStorePath("altman")).toContain(
      "/docket/altman/edit-proposals"
    );
  });
});

describe("docket-edit-proposals Worker handlers", () => {
  it("GET empty then PUT signed proposals then GET restored", async () => {
    const db = new DocketStoreDb() as unknown as D1Database;
    const empty = await handleGetDocketEditProposals(
      new Request("https://humanity.llc/.well-known/hc/v1/docket/altman/edit-proposals"),
      db,
      "altman"
    );
    expect(empty.status).toBe(200);
    const emptyBody = (await empty.json()) as { empty?: boolean; proposals: unknown[] };
    expect(emptyBody.empty).toBe(true);
    expect(emptyBody.proposals).toEqual([]);

    let proposal = await createDocketEditProposalSigned(
      {
        id: "prop_store_1",
        field_path: "note",
        summary: "Store test",
        before: "a",
        after: "b",
        proposed_by: "hc-founders",
      },
      "altman",
      stewards
    );
    proposal = await approveDocketEditProposalSigned(
      proposal,
      "altman",
      "hc-reviewer",
      stewards
    );

    const put = await handlePutDocketEditProposals(
      new Request("https://humanity.llc/.well-known/hc/v1/docket/altman/edit-proposals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposals: [proposal] }),
      }),
      db,
      "altman"
    );
    expect(put.status).toBe(200);
    const putBody = (await put.json()) as {
      proposals: unknown[];
      writes_published_json: boolean;
    };
    expect(putBody.writes_published_json).toBe(false);
    expect(putBody.proposals).toHaveLength(1);

    const got = await handleGetDocketEditProposals(
      new Request("https://humanity.llc/.well-known/hc/v1/docket/altman/edit-proposals"),
      db,
      "altman"
    );
    const gotBody = (await got.json()) as { proposals: { id: string }[] };
    expect(gotBody.proposals[0]?.id).toBe("prop_store_1");
  });

  it("rejects unsigned proposals", async () => {
    const db = new DocketStoreDb() as unknown as D1Database;
    const res = await handlePutDocketEditProposals(
      new Request("https://humanity.llc/.well-known/hc/v1/docket/altman/edit-proposals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposals: [
            {
              id: "prop_bad",
              field_path: "note",
              summary: "no sig",
              before: "a",
              after: "b",
              proposed_by: "hc-founders",
              approvals: ["hc-founders"],
              status: "pending",
              proposed_at: "2026-07-16",
              resolved_at: null,
            },
          ],
        }),
      }),
      db,
      "altman"
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_signatures");
  });
});

describe("ws-docket-dg-store kit + preflight", () => {
  it("builds valid kit HTML", () => {
    const html = buildWsDocketDgStoreKitHtml({ origin: "http://127.0.0.1:8788" });
    expect(validateWsDocketDgStoreKitHtml(html)).toBe(true);
  });

  it("preflight ready after kit write", () => {
    expect(assessWsDocketDgStorePreflight(root).engineeringMet).toBe(true);
  });
});
