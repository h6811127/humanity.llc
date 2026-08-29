import { describe, expect, it } from "vitest";

import {
  createDocketEditProposalSigned,
  approveDocketEditProposalSigned,
} from "../../site/js/docket-edit-proposal-sign-core.mjs";
import {
  DOCKET_EDIT_PROPOSAL_STORE_MAX,
  buildDocketEditProposalStoreDocument,
  isValidDocketStoreCaseId,
  validateDocketEditProposalStoreDocument,
} from "../../site/js/docket-edit-proposal-store-core.mjs";
import {
  handleGetDocketEditProposals,
  handlePutDocketEditProposals,
} from "../src/resolver/docket-edit-proposals";

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

function putRequest(caseId, body) {
  return new Request(
    `https://humanity.llc/.well-known/hc/v1/docket/${caseId}/edit-proposals`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    }
  );
}

function getRequest(caseId) {
  return new Request(
    `https://humanity.llc/.well-known/hc/v1/docket/${caseId}/edit-proposals`
  );
}

async function signedPending(caseId, id = "prop_edge_1") {
  return createDocketEditProposalSigned(
    {
      id,
      field_path: "note",
      summary: "Edge store test",
      before: "a",
      after: "b",
      proposed_by: "hc-founders",
    },
    caseId,
    stewards
  );
}

describe("docket store case-id + document edges", () => {
  it("accepts slug ids and rejects short, dotted, or traversal-like ids", () => {
    expect(isValidDocketStoreCaseId("altman")).toBe(true);
    expect(isValidDocketStoreCaseId("  chapter-cr-research-circle  ")).toBe(true);
    expect(isValidDocketStoreCaseId("ab")).toBe(true);
    expect(isValidDocketStoreCaseId("a")).toBe(false);
    expect(isValidDocketStoreCaseId("")).toBe(false);
    expect(isValidDocketStoreCaseId("..")).toBe(false);
    expect(isValidDocketStoreCaseId("altman.json")).toBe(false);
    expect(isValidDocketStoreCaseId("-altman")).toBe(false);
    expect(isValidDocketStoreCaseId("alt man")).toBe(false);
  });

  it("refuses store documents that would claim to write published JSON", () => {
    const valid = buildDocketEditProposalStoreDocument({
      caseId: "altman",
      proposals: [],
      updatedAt: "2026-08-29T00:00:00.000Z",
    });
    expect(validateDocketEditProposalStoreDocument(valid).ok).toBe(true);
    expect(
      validateDocketEditProposalStoreDocument({
        ...valid,
        writes_published_json: true,
      }).ok
    ).toBe(false);
    expect(
      validateDocketEditProposalStoreDocument({
        ...valid,
        kind: "hc.docket.edit_proposals_store.v1",
      }).ok
    ).toBe(false);
  });

  it("caps Worker store at 40 proposals", () => {
    expect(() =>
      buildDocketEditProposalStoreDocument({
        caseId: "altman",
        proposals: Array.from({ length: DOCKET_EDIT_PROPOSAL_STORE_MAX + 1 }, (_, i) => ({
          id: `prop_${i}`,
        })),
      })
    ).toThrow(/At most 40/);
  });
});

describe("docket-edit-proposals Worker handler edges", () => {
  it("rejects invalid case ids on GET and PUT", async () => {
    const db = new DocketStoreDb();
    const get = await handleGetDocketEditProposals(getRequest("x"), db, "x");
    expect(get.status).toBe(400);
    expect(await get.json()).toMatchObject({ error: "invalid_case_id" });

    const put = await handlePutDocketEditProposals(
      putRequest("..", JSON.stringify({ proposals: [] })),
      db,
      ".."
    );
    expect(put.status).toBe(400);
    expect(await put.json()).toMatchObject({ error: "invalid_case_id" });
  });

  it("returns corrupt_store when D1 JSON is unparseable", async () => {
    const db = new DocketStoreDb();
    db.rows.set("altman", {
      case_id: "altman",
      proposals_json: "{not-json",
      updated_at: "2026-08-29T00:00:00.000Z",
      created_at: "2026-08-29T00:00:00.000Z",
    });
    const res = await handleGetDocketEditProposals(getRequest("altman"), db, "altman");
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "corrupt_store" });
  });

  it("treats non-array stored JSON as an empty proposal list", async () => {
    const db = new DocketStoreDb();
    db.rows.set("altman", {
      case_id: "altman",
      proposals_json: JSON.stringify({ unexpected: true }),
      updated_at: "2026-08-29T00:00:00.000Z",
      created_at: "2026-08-29T00:00:00.000Z",
    });
    const res = await handleGetDocketEditProposals(getRequest("altman"), db, "altman");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.proposals).toEqual([]);
    expect(body.writes_published_json).toBe(false);
  });

  it("rejects malformed PUT bodies before touching D1", async () => {
    const db = new DocketStoreDb();
    const invalidJson = await handlePutDocketEditProposals(
      putRequest("altman", "not-json"),
      db,
      "altman"
    );
    expect(invalidJson.status).toBe(400);
    expect(await invalidJson.json()).toMatchObject({ error: "invalid_json" });

    const arrayBody = await handlePutDocketEditProposals(
      putRequest("altman", JSON.stringify([])),
      db,
      "altman"
    );
    expect(arrayBody.status).toBe(400);
    expect(await arrayBody.json()).toMatchObject({ error: "invalid_body" });

    const missing = await handlePutDocketEditProposals(
      putRequest("altman", JSON.stringify({})),
      db,
      "altman"
    );
    expect(missing.status).toBe(400);
    expect(await missing.json()).toMatchObject({ error: "proposals_required" });
    expect(db.rows.size).toBe(0);
  });

  it("rejects unsigned-shape proposals before crypto verify", async () => {
    const db = new DocketStoreDb();
    const res = await handlePutDocketEditProposals(
      putRequest(
        "altman",
        JSON.stringify({
          proposals: [
            {
              id: "prop_bad_path",
              field_path: "__proto__",
              summary: "inject",
              before: "",
              after: "x",
              proposed_by: "hc-founders",
              approvals: ["hc-founders"],
              status: "pending",
              proposed_at: "2026-08-29",
              resolved_at: null,
            },
          ],
        })
      ),
      db,
      "altman"
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_proposals");
    expect(body.details.some((e) => e.includes("field_path"))).toBe(true);
    expect(db.rows.size).toBe(0);
  });

  it("rejects a signature bound to a different case id", async () => {
    const db = new DocketStoreDb();
    const proposal = await signedPending("altman", "prop_cross_case");
    const res = await handlePutDocketEditProposals(
      putRequest("musk", JSON.stringify({ proposals: [proposal] })),
      db,
      "musk"
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_signatures" });
    expect(db.rows.has("musk")).toBe(false);
  });

  it("rejects approved status that has two id approvals but only one signature", async () => {
    const db = new DocketStoreDb();
    const pending = await signedPending("altman", "prop_one_sig");
    const res = await handlePutDocketEditProposals(
      putRequest(
        "altman",
        JSON.stringify({
          proposals: [
            {
              ...pending,
              status: "approved",
              approvals: ["hc-founders", "hc-reviewer"],
            },
          ],
        })
      ),
      db,
      "altman"
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    // Shape gate runs before crypto verify and refuses approved rows with <2 signatures.
    expect(body.error).toBe("invalid_proposals");
    expect(body.details.join(" ")).toMatch(/requires 2 distinct signatures/);
    expect(db.rows.size).toBe(0);
  });

  it("keeps case stores isolated and preserves created_at on upsert", async () => {
    const db = new DocketStoreDb();
    let altman = await signedPending("altman", "prop_altman");
    altman = await approveDocketEditProposalSigned(
      altman,
      "altman",
      "hc-reviewer",
      stewards
    );
    const putAltman = await handlePutDocketEditProposals(
      putRequest("altman", JSON.stringify({ proposals: [altman] })),
      db,
      "altman"
    );
    expect(putAltman.status).toBe(200);
    const createdAt = db.rows.get("altman").created_at;

    const muskEmpty = await handleGetDocketEditProposals(
      getRequest("musk"),
      db,
      "musk"
    );
    const muskBody = await muskEmpty.json();
    expect(muskBody.empty).toBe(true);
    expect(muskBody.proposals).toEqual([]);

    let musk = await signedPending("musk", "prop_musk");
    musk = await approveDocketEditProposalSigned(
      musk,
      "musk",
      "hc-reviewer",
      stewards
    );
    const putMusk = await handlePutDocketEditProposals(
      putRequest("musk", JSON.stringify({ proposals: [musk] })),
      db,
      "musk"
    );
    expect(putMusk.status).toBe(200);

    const gotAltman = await handleGetDocketEditProposals(
      getRequest("altman"),
      db,
      "altman"
    );
    expect((await gotAltman.json()).proposals[0].id).toBe("prop_altman");

    const putAgain = await handlePutDocketEditProposals(
      putRequest("altman", JSON.stringify({ proposals: [altman] })),
      db,
      "altman"
    );
    expect(putAgain.status).toBe(200);
    expect(db.rows.get("altman").created_at).toBe(createdAt);
  });
});
