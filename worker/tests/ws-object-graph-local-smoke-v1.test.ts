import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PROD_CABINET_QR,
  PROD_PROFILE_ID,
  evaluateCabinetGraphSmoke,
  evaluateCabinetGraphSmokeLocal,
  resolveLocalCabinetSmokeUrls,
  resolveProdCabinetSmokeUrls,
} from "../scripts/ws-object-graph-prod-smoke-core.mjs";

const root = join(import.meta.dirname, "../..");
const seedPath = join(root, "worker/.local/city-game-seed.json");

describe("ws-object-graph-local-smoke-core", () => {
  it("resolves local cabinet URLs from city-game-seed.json", () => {
    const seed = JSON.parse(readFileSync(seedPath, "utf8"));
    const urls = resolveLocalCabinetSmokeUrls(seed, "http://127.0.0.1:8787");
    expect(urls.profileId).toBe(seed.profile_id);
    expect(urls.cabinetScan).toContain("qr_Ag51j5E7WAAk5E5t");
    expect(urls.libraryScan).toContain("qr_hfiQzG53d6oj25aq");
    expect(urls.riverScan).toContain("qr_aV3BcFtid5NBfCuM");
    expect(urls.siteCodes.witness).toBe("CR-WITNS-4P");
    expect(urls.siteCodes.quorum).toBe("CR-LANTERN-7K");
  });

  it("resolves production cabinet URLs", () => {
    const urls = resolveProdCabinetSmokeUrls();
    expect(urls.profileId).toBe(PROD_PROFILE_ID);
    expect(urls.cabinetScan).toContain(PROD_CABINET_QR);
    expect(urls.cabinetStatus).toContain("/status?q=");
  });

  it("evaluateCabinetGraphSmokeLocal allows unlock already satisfied", () => {
    const status = {
      scan: {
        relationships: [
          { edge_id: "edge_cr_witness_10_07", kind: "witnesses", satisfied: false },
          { edge_id: "edge_cr_unlock_04_07", kind: "unlocks", satisfied: true },
        ],
      },
    };
    const html = `<section id="scan-object-graph-heading">How this place connects</section>
<p>Before you can open this</p>
<li class="scan-object-graph-row"><span class="scan-object-graph-status">Missing</span></li>
<p>Library witness vouch opens cabinet path</p>
<li class="scan-object-graph-row"><span class="scan-object-graph-status">Live</span></li>
<p>River Lantern unlocks Czech Village cabinet</p>
<p>Not yet open — visit</p>`;
    const rows = evaluateCabinetGraphSmokeLocal(status, html);
    expect(rows.every((row) => row.ok)).toBe(true);
  });

  it("evaluateCabinetGraphSmoke requires both edges pending", () => {
    const status = {
      scan: {
        relationships: [
          { edge_id: "edge_cr_witness_10_07", kind: "witnesses", satisfied: false },
          { edge_id: "edge_cr_unlock_04_07", kind: "unlocks", satisfied: false },
        ],
      },
    };
    const html = `<section id="scan-object-graph-heading">How this place connects</section>
<p>Before you can open this</p>
<li class="scan-object-graph-row"><span class="scan-object-graph-status">Missing</span></li>
<p>Library witness vouch opens cabinet path</p>
<li class="scan-object-graph-row"><span class="scan-object-graph-status">Missing</span></li>
<p>River Lantern unlocks Czech Village cabinet</p>
<p>Not yet open — visit</p>`;
    const rows = evaluateCabinetGraphSmoke(status, html);
    expect(rows.every((row) => row.ok)).toBe(true);
  });
});
