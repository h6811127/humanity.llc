import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  DOCKET_CASE_IDS,
  DOCKET_CLOSED_KINDS,
  DOCKET_ACCOUNTABILITY_DAY_PATH,
  DOCKET_RESEARCH_KIT_PATH,
  DOCKET_QR_FIELD_KIT_PATH,
  docketCaseDataPath,
  docketCaseOgDescription,
  docketCasePagePath,
  docketMonogram,
  formatDocketRank,
  renderDocketCasePageBodyHtml,
  renderDocketClosedCriteriaHtml,
  renderDocketNetworkGoodHtml,
  renderDocketRosterCardHtml,
  renderDocketStewardShellHtml,
  validateDocketCase,
  validateDocketCasesIndex,
  validateDocketNetworkGoods,
  validateDocketPhotoLicenseChecklist,
} from "../../site/js/docket-case-core.mjs";
import { docketCaseIdFromPath } from "../../site/js/docket-case-page.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = join(root, "site/data");

describe("docket-case-core", () => {
  const index = JSON.parse(
    readFileSync(join(dataDir, "docket-cases-index.json"), "utf8")
  );

  it("validates the shipped cases index", () => {
    const result = validateDocketCasesIndex(index);
    expect(result.ok).toBe(true);
    expect(index.cases.map((c) => c.id).sort()).toEqual([...DOCKET_CASE_IDS].sort());
  });

  for (const id of DOCKET_CASE_IDS) {
    it(`validates docket-case-${id}.json`, () => {
      const raw = JSON.parse(
        readFileSync(join(dataDir, `docket-case-${id}.json`), "utf8")
      );
      const result = validateDocketCase(raw);
      expect(result.ok, result.ok ? "" : result.errors.join("; ")).toBe(true);
      expect(raw.id).toBe(id);
      expect(raw.photo_ref).toBeNull();
    });
  }

  it("rejects icc_allegation without http(s) source", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-netanyahu.json"), "utf8")
    );
    raw.sources = [{ label: "Tip", url: "mailto:info@humanity.llc" }];
    const result = validateDocketCase(raw);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("icc_allegation"))).toBe(true);
  });

  it("requires closed_reason and closed_kind when status is closed", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-altman.json"), "utf8")
    );
    raw.status = "closed";
    raw.closed_reason = null;
    raw.closed_kind = null;
    expect(validateDocketCase(raw).ok).toBe(false);
    raw.closed_reason = "Audit published with receipts";
    expect(validateDocketCase(raw).ok).toBe(false);
    raw.closed_kind = "outcome_logged";
    expect(validateDocketCase(raw).ok).toBe(true);
  });

  it("requires counter_docket and rejects unknown counter status", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-musk.json"), "utf8")
    );
    delete raw.counter_docket;
    expect(validateDocketCase(raw).ok).toBe(false);
    raw.counter_docket = { status: "flame_war", summary: null };
    expect(validateDocketCase(raw).ok).toBe(false);
    raw.counter_docket = { status: "has_reply", summary: null };
    expect(validateDocketCase(raw).ok).toBe(false);
    raw.counter_docket = {
      status: "has_reply",
      summary: "Counsel submitted a dated rebuttal linking primary filings.",
    };
    expect(validateDocketCase(raw).ok).toBe(true);
  });

  it("rejects unknown badge.kind", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-musk.json"), "utf8")
    );
    raw.badge = { kind: "fbi", label: "Nope" };
    expect(validateDocketCase(raw).ok).toBe(false);
  });

  it("formats rank, monogram, paths", () => {
    expect(formatDocketRank(1)).toBe("01");
    expect(docketMonogram("Benjamin Netanyahu")).toBe("BN");
    expect(docketCaseDataPath("netanyahu")).toBe("/data/docket-case-netanyahu.json");
    expect(docketCasePagePath("putin")).toBe("/docket/putin/");
    expect(docketCaseOgDescription("X", "Count")).toContain("Nonviolent");
  });

  it("renders roster card with data-docket-case hook and existing classes", () => {
    const row = index.cases[0];
    const full = JSON.parse(
      readFileSync(join(dataDir, "docket-case-netanyahu.json"), "utf8")
    );
    const html = renderDocketRosterCardHtml(row, full);
    expect(html).toContain('data-docket-case="netanyahu"');
    expect(html).toContain("docket-wanted-card");
    expect(html).toContain("docket-plate");
    expect(html).toContain("docket-plate-mono");
    expect(html).toContain("docket-plate-action");
    expect(html).toContain("/docket/netanyahu/");
    expect(html).toContain("Murder");
  });

  it("renders case page body with Public Docket eyebrow and person as h1", () => {
    const full = JSON.parse(
      readFileSync(join(dataDir, "docket-case-netanyahu.json"), "utf8")
    );
    const html = renderDocketCasePageBodyHtml(full);
    expect(html).toContain('<h1 class="docket-wanted-name docket-case-name">Benjamin Netanyahu</h1>');
    expect(html).toContain("Public Docket · Case 01");
    expect(html).toContain("docket-plate-mono-lg");
    expect(html).toContain("docket-case-strongest");
    expect(html).toContain("icc-cpi.int");
    expect(html).toContain('id="action-kit"');
    expect(html).toContain("docket-action-kit");
    expect(html).toContain("data-docket-action-kind=\"read_source\"");
    expect(html).toContain("docket-action-region");
    expect(html).toContain('id="exit-criteria"');
    expect(html).toContain('id="counter-docket"');
    expect(html).toContain('id="corrections"');
    expect(html).toContain('id="network-good"');
    expect(html).toContain("/docket/goods/research-kit/");
    expect(html).toContain("/docket/goods/qr-field-kit/");
    expect(html).toContain("/docket/accountability-day/");
    expect(html).toContain("/docket/#tos");
    expect(html).toContain('id="stewards"');
    expect(html).toContain('id="changelog"');
    expect(html).toContain("humanity.llc stewards");
    expect(html).toContain('id="live-object"');
    expect(html).toContain("docket-live-object-slot");
    expect(html).toContain("/docket/netanyahu/steward/");
  });

  it("renders steward shell with bound live_object (case URL interim)", () => {
    const full = JSON.parse(
      readFileSync(join(dataDir, "docket-case-netanyahu.json"), "utf8")
    );
    const html = renderDocketStewardShellHtml(full);
    expect(html).toContain("steward shell");
    expect(html).toContain('data-docket-live-status="bound"');
    expect(html).toContain("/docket/netanyahu/");
    expect(html).toContain('id="qr-upgrade"');
    expect(html).toContain("docket-qr-upgrade-root");
    expect(html).toContain('id="discovery-opt-in"');
    expect(html).toContain("docket-discovery-opt-in-root");
    expect(html).toContain('id="photos"');
    expect(html).toContain("docket-photos-root");
    expect(html).toContain("#corrections");
  });

  it("rejects bound live_object without object_id/scan_path", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-altman.json"), "utf8")
    );
    raw.live_object = {
      status: "bound",
      object_id: null,
      scan_path: null,
      discovery_opt_in: false,
      bind_notes: "bad",
    };
    expect(validateDocketCase(raw).ok).toBe(false);
    raw.live_object.object_id = "obj_test";
    raw.live_object.scan_path = "/c/testProfileId01?q=qr_test";
    expect(validateDocketCase(raw).ok).toBe(true);
  });

  it("rejects discovery_opt_in true without child QR + dual approvals", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-musk.json"), "utf8")
    );
    raw.live_object.discovery_opt_in = true;
    expect(validateDocketCase(raw).ok).toBe(false);
  });

  it("allows discovery_opt_in true when C-v3 rules are met (rehearsal on roster id)", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-altman.json"), "utf8")
    );
    raw.live_object = {
      status: "bound",
      object_id: "obj_docket_casefile_altman",
      scan_path: "/c/docketAltmanChild01?q=qr_docket_altman_v1",
      discovery_opt_in: true,
      discovery: {
        listed_reason: "Chapter teach-in pin with venue consent",
        approvals: ["hc-founders", "hc-reviewer"],
      },
      bind_notes: "C-v3 schema rehearsal — published starter-four stay false via assert gate",
    };
    expect(validateDocketCase(raw).ok).toBe(true);
  });

  it("renders published closed-case criteria without celebrating harm", () => {
    const html = renderDocketClosedCriteriaHtml();
    expect(DOCKET_CLOSED_KINDS).toContain("outcome_logged");
    expect(html).toContain("data-docket-closed-kind=\"outcome_logged\"");
    expect(html).toContain("Never a valid close reason");
    expect(html).toContain("Death, injury, disappearance");
    expect(html).not.toContain("taken out");
  });

  it("validates campaign-one network goods registry", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-network-goods.json"), "utf8")
    );
    expect(validateDocketNetworkGoods(raw).ok).toBe(true);
    expect(raw.goods[0].href).toBe(DOCKET_RESEARCH_KIT_PATH);
    expect(raw.goods.map((g) => g.href)).toContain(DOCKET_QR_FIELD_KIT_PATH);
    expect(raw.ritual.href).toBe(DOCKET_ACCOUNTABILITY_DAY_PATH);
    const html = renderDocketNetworkGoodHtml();
    expect(html).toContain(DOCKET_RESEARCH_KIT_PATH);
    expect(html).toContain(DOCKET_QR_FIELD_KIT_PATH);
    expect(html).toContain(DOCKET_ACCOUNTABILITY_DAY_PATH);
  });

  it("keeps Most Wanted faces not_licensed; rehearsal pack may be licensed", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-photo-license-checklist.json"), "utf8")
    );
    expect(validateDocketPhotoLicenseChecklist(raw).ok).toBe(true);
    const starter = raw.cases.filter((row) =>
      ["netanyahu", "putin", "altman", "musk"].includes(row.id)
    );
    expect(starter.length).toBe(4);
    for (const row of starter) {
      expect(row.license_status).toBe("not_licensed");
      expect(row.photo_ref).toBeNull();
    }
    const rehearsal = raw.cases.find((row) => row.id === "rehearsal-commons");
    expect(rehearsal?.license_status).toBe("licensed");
    expect(rehearsal?.photo_ref).toMatch(/license-pack-rehearsal/);
  });

  it("requires stewards and changelog", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-altman.json"), "utf8")
    );
    delete raw.stewards;
    expect(validateDocketCase(raw).ok).toBe(false);
    raw.stewards = [
      {
        id: "x",
        display_name: "X",
        role_label: "Maintainer",
        mailto: null,
        room_ref: null,
      },
    ];
    delete raw.changelog;
    expect(validateDocketCase(raw).ok).toBe(false);
  });

  it("rejects action kits outside 3–5 items or unknown kind", () => {
    const raw = JSON.parse(
      readFileSync(join(dataDir, "docket-case-altman.json"), "utf8")
    );
    raw.actions = raw.actions.slice(0, 2);
    expect(validateDocketCase(raw).ok).toBe(false);
    raw.actions = JSON.parse(
      readFileSync(join(dataDir, "docket-case-altman.json"), "utf8")
    ).actions;
    raw.actions[0].kind = "doxxing";
    expect(validateDocketCase(raw).ok).toBe(false);
  });
});

describe("docket plate stylesheet (WS-DOCKET-A)", () => {
  it("ships docket.css without FBI chrome", () => {
    const css = readFileSync(join(root, "site/css/docket.css"), "utf8");
    expect(css).toContain(".docket-plate-mono");
    expect(css).toContain("docket-plate-in");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).not.toMatch(/class:\s*["']?wanted["']/i);
    expect(css).not.toContain("WANTED");
  });
});

describe("docket-case-page path helper", () => {
  it("parses case id from pathname", () => {
    expect(docketCaseIdFromPath("/docket/netanyahu/")).toBe("netanyahu");
    expect(docketCaseIdFromPath("/docket/putin")).toBe("putin");
    expect(docketCaseIdFromPath("/docket/altman/steward/")).toBe("altman");
    expect(docketCaseIdFromPath("/docket/")).toBeNull();
  });
});

describe("docket steward shells", () => {
  for (const id of DOCKET_CASE_IDS) {
    it(`ships /docket/${id}/steward/`, () => {
      const path = join(root, "site/docket", id, "steward", "index.html");
      expect(existsSync(path)).toBe(true);
      const html = readFileSync(path, "utf8");
      expect(html).toContain(`data-docket-case-id="${id}"`);
      expect(html).toContain("docket-steward-page.mjs");
      expect(html).toContain("· Public Docket");
    });
  }
});

describe("docket network good + Accountability Day shells", () => {
  it("ships research kit, QR field kit, and Accountability Day pages", () => {
    const kit = join(root, "site/docket/goods/research-kit/index.html");
    const fieldKit = join(root, "site/docket/goods/qr-field-kit/index.html");
    const day = join(root, "site/docket/accountability-day/index.html");
    expect(existsSync(kit)).toBe(true);
    expect(existsSync(fieldKit)).toBe(true);
    expect(existsSync(day)).toBe(true);
    const kitHtml = readFileSync(kit, "utf8");
    const fieldHtml = readFileSync(fieldKit, "utf8");
    const dayHtml = readFileSync(day, "utf8");
    expect(kitHtml).toContain("Public Docket research kit");
    expect(kitHtml).toContain("Label hygiene");
    expect(kitHtml).toContain("Chapter checklist");
    expect(kitHtml).toContain("/docket/goods/qr-field-kit/");
    expect(fieldHtml).toContain("QR field kit");
    expect(fieldHtml).toContain("Drop checklist");
    expect(fieldHtml).toContain("Never print FBI");
    expect(fieldHtml).toContain("#action-kit");
    expect(dayHtml).toContain("Accountability Day");
    expect(dayHtml).toContain("Closed with receipts");
    expect(dayHtml).toContain("Goods fair");
    expect(dayHtml).toContain("/docket/goods/qr-field-kit/");
    expect(dayHtml).toContain("Offer to host");
  });
});

describe("docket case page shells", () => {
  for (const id of DOCKET_CASE_IDS) {
    it(`ships /docket/${id}/ with OG Public Docket title`, () => {
      const path = join(root, "site/docket", id, "index.html");
      expect(existsSync(path)).toBe(true);
      const html = readFileSync(path, "utf8");
      expect(html).toContain("· Public Docket");
      expect(html).toContain(`data-docket-case-id="${id}"`);
      expect(html).toContain("docket-case-page.mjs");
      expect(html).not.toContain("WANTED");
      expect(html).not.toContain("FBI");
    });
  }
});
