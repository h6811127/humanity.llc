import { describe, expect, it } from "vitest";

import {
  assessComprehensionEngineeringReady,
  applyComprehensionRunbookPrimaryScanUrl,
  applyComprehensionRunbookProductionUrls,
  auditComprehensionKitHtml,
  buildComprehensionKitHtml,
  buildComprehensionRunbookProductionUrlsBlock,
  formatComprehensionPreflightReport,
  formatLaunchPreflightReport,
  parseQrPackScanUrls,
  resolveKitScanUrls,
  resolveProductionKitScanUrls,
  resolveProductionScanUrlByNode,
} from "../scripts/city-game-comprehension-kit-core.mjs";
import {
  applyComprehensionRunbookPass,
  parseComprehensionSignOffArgs,
  resolveComprehensionSignOffResult,
} from "../scripts/city-game-comprehension-sign-off-core.mjs";

describe("city-game-comprehension-kit-core", () => {
  it("resolves kit scan URLs from seed nodes", () => {
    const kit = resolveKitScanUrls(
      [
        {
          node_id: "node_04",
          public_label: "River Lantern",
          qr_id: "qr_river",
          local_scan_url: "http://127.0.0.1:8787/c/prof1?q=qr_river",
        },
        { node_id: "node_07", public_label: "Cabinet", qr_id: "qr_cab" },
      ],
      "prof1",
      "192.168.1.42"
    );
    expect(kit.find((n) => n.node_id === "node_04")?.href).toBe(
      "http://192.168.1.42:8787/c/prof1?q=qr_river"
    );
    expect(kit.find((n) => n.node_id === "node_07")?.href).toBe(
      "http://192.168.1.42:8787/c/prof1?q=qr_cab"
    );
  });

  it("renders scorecard HTML with rules-first Jamie wayfinding", () => {
    const season = {
      city: "Cedar Rapids, Iowa",
      rules_path: "/play/cedar-rapids/",
      player_guide: {
        quorum_spot: { title: "Riverwalk River Lantern", body: "Quorum" },
      },
      comprehension_kit: { primary_scan_node: "node_04" },
    };
    const html = buildComprehensionKitHtml({
      host: "127.0.0.1",
      hubUrl: "http://127.0.0.1:8788/dev/city-game-lan-hub",
      rulesUrl: "https://humanity.llc/play/cedar-rapids/",
      kitNodes: [
        {
          node_id: "node_04",
          label: "River Lantern",
          href: "https://humanity.llc/c/p?q=qr_04",
          blurb: "GT-1",
        },
      ],
      production: true,
      season,
    });
    expect(html).toContain("Start here:");
    expect(html).toContain("https://humanity.llc/play/cedar-rapids/");
    expect(html).toContain("GT-W1");
    expect(html).toContain("Riverwalk River Lantern");
    expect(html).toContain("place list");
    expect(html).toContain("https://humanity.llc/c/p?q=qr_04");
    expect(html).toContain("GT-7");
    expect(html).toContain("/play/cedar-rapids/map/");
    expect(html).toContain("noindex,nofollow");
  });

  it("parses production scan URLs from QR pack markdown", () => {
    const urls = parseQrPackScanUrls(
      "| node_04 | Riverwalk River Lantern | https://humanity.llc/c/GcP3?q=qr_a | — |"
    );
    expect(urls.node_04).toBe("https://humanity.llc/c/GcP3?q=qr_a");
  });

  it("resolves production kit nodes from season labels", () => {
    const kit = resolveProductionKitScanUrls(
      { node_04: "https://humanity.llc/c/p?q=qr_04" },
      {
        nodes: [{ node_id: "node_04", label: "Riverwalk River Lantern" }],
        automation: { quorum_nodes: ["node_04"] },
        comprehension_kit: {
          probe_nodes: ["node_04"],
          blurbs: { node_04: "GT-1" },
        },
      }
    );
    expect(kit[0]?.href).toContain("qr_04");
    expect(kit[0]?.label).toBe("Riverwalk River Lantern");
  });

  it("resolves production scan URLs from local seed when season root matches", () => {
    const season = { season_root_profile_id: "CEenC57QN9qqnr2x5L89cbWt" };
    const resolved = resolveProductionScanUrlByNode(season, {
      productionSeed: {
        profile_id: "GcP3Ee17yGqMHdidhEVMYBzq",
        nodes: [{ node_id: "node_04", scan_url: "https://humanity.llc/c/GcP3?q=old" }],
      },
      localSeed: {
        profile_id: "CEenC57QN9qqnr2x5L89cbWt",
        nodes: [{ node_id: "node_04", scan_url: "https://humanity.llc/c/CEen?q=new" }],
      },
    });
    expect(resolved.source).toBe("local-seed");
    expect(resolved.scanUrlByNode.node_04).toContain("CEen");
  });

  it("updates comprehension runbook production URL block", () => {
    const content = `**Production URLs (2026-06-03):**

| Step | URL |
|------|-----|
| Rules | https://old/rules |

**Optional spot checks**`;
    const block = buildComprehensionRunbookProductionUrlsBlock({
      dateIso: "2026-06-04",
      rulesUrl: "https://humanity.llc/play/cedar-rapids/",
      kitUrl: "https://humanity.llc/play/cedar-rapids/comprehension/",
      primaryScanUrl: "https://humanity.llc/c/CEen?q=qr_04",
      boardUrl: "https://humanity.llc/play/cedar-rapids/map/",
    });
    const out = applyComprehensionRunbookProductionUrls(content, block);
    expect(out).toContain("2026-06-04");
    expect(out).toContain("CEen?q=qr_04");
    expect(out).toContain("**Optional spot checks**");
    const step3 = applyComprehensionRunbookPrimaryScanUrl(
      "> **Step 3:** Scan this sticker URL:  \n> https://humanity.llc/c/Old?q=qr",
      "https://humanity.llc/c/CEen?q=qr_04"
    );
    expect(step3).toContain("CEen?q=qr_04");
  });

  it("audits comprehension kit HTML for C2 engineering gate", () => {
    const season = {
      season_root_profile_id: "CEenC57QN9qqnr2x5L89cbWt",
      comprehension_kit: { primary_scan_node: "node_04" },
    };
    const html = buildComprehensionKitHtml({
      host: "127.0.0.1",
      rulesUrl: "https://humanity.llc/play/cedar-rapids/",
      kitNodes: [
        {
          node_id: "node_04",
          label: "River Lantern",
          href: "https://humanity.llc/c/CEenC57QN9qqnr2x5L89cbWt?q=qr_04",
          blurb: "GT-1",
        },
      ],
      production: true,
      season,
    });
    const { ok, issues } = auditComprehensionKitHtml(html, { season });
    expect(issues).toEqual([]);
    expect(ok).toBe(true);
  });

  it("flags stale production profile in comprehension kit", () => {
    const season = { season_root_profile_id: "CEenC57QN9qqnr2x5L89cbWt" };
    const { ok, issues } = auditComprehensionKitHtml(
      '<meta name="robots" content="noindex,nofollow" />GT-1: x GT-7: y node_04 humanity.llc/c/OldProfile?q=qr',
      { season }
    );
    expect(ok).toBe(false);
    expect(issues.some((i) => i.includes("OldProfile"))).toBe(true);
  });

  it("passes production kit when URLs match production seed custody", () => {
    const deployed = "GcP3Ee17yGqMHdidhEVMYBzq";
    const season = {
      season_root_profile_id: "CEenC57QN9qqnr2x5L89cbWt",
      comprehension_kit: { primary_scan_node: "node_04" },
    };
    const html = buildComprehensionKitHtml({
      host: "humanity.llc",
      rulesUrl: "https://humanity.llc/play/cedar-rapids/",
      kitNodes: [
        {
          node_id: "node_04",
          label: "River Lantern",
          href: `https://humanity.llc/c/${deployed}?q=qr_04`,
          blurb: "GT-1",
        },
      ],
      production: true,
      season,
    });
    const { ok, issues, custodyDrift } = auditComprehensionKitHtml(html, {
      season,
      expectedScanProfileId: deployed,
    });
    expect(issues).toEqual([]);
    expect(ok).toBe(true);
    expect(custodyDrift).toContain("CEen");
    expect(custodyDrift).toContain(deployed);
  });

  it("assesses local comprehension engineering ready", () => {
    const season = {
      season_root_profile_id: "CEenC57QN9qqnr2x5L89cbWt",
      comprehension_kit: { primary_scan_node: "node_04" },
    };
    const html = buildComprehensionKitHtml({
      host: "192.168.1.5",
      rulesUrl: "http://192.168.1.5:8788/play/cedar-rapids/",
      kitNodes: [
        {
          node_id: "node_04",
          label: "River Lantern",
          href: "http://192.168.1.5:8787/c/CEenC57QN9qqnr2x5L89cbWt?q=qr_04",
          blurb: "GT-1",
        },
      ],
      season,
    });
    const result = assessComprehensionEngineeringReady({
      season,
      localSeed: true,
      localDevPageHtml: html,
      productionPageHtml: null,
    });
    expect(result.ready).toBe(true);
    expect(result.localOk).toBe(true);
  });

  it("formats C2 comprehension preflight report", () => {
    const text = formatComprehensionPreflightReport({
      ready: true,
      localOk: true,
      productionOk: false,
      issues: [],
      warnings: ["Production kit stale"],
      humanSignedOff: false,
    });
    expect(text).toContain("C2 engineering: ☑");
    expect(text).toContain("city-game:dev -- --lan");
    expect(text).toContain("comprehension-sign-off");
  });

  it("parses comprehension sign-off args", () => {
    const parsed = parseComprehensionSignOffArgs([
      "--pass",
      "--apply",
      "--testers",
      "5",
      "--pass-count",
      "5",
      "--date",
      "2026-06-07",
    ]);
    expect(parsed.pass).toBe(true);
    expect(parsed.apply).toBe(true);
    expect(parsed.testers).toBe("5");
    expect(resolveComprehensionSignOffResult(parsed)).toBe("pass");
  });

  it("applies comprehension runbook pass marker", () => {
    const content = `**Status:** Runbook ready; **human execution pending**
| Result | \`[ ] Pass · [ ] Fail — copy fix before launch\` |`;
    const out = applyComprehensionRunbookPass(content, {
      dateIso: "2026-06-07",
      testers: "5",
      passCount: "5",
    });
    expect(out).toContain("GT comprehension **passed**");
    expect(out).toContain("☑ Pass");
  });

  it("formats launch preflight report with C1 when launch fields set", () => {
    const text = formatLaunchPreflightReport({
      engineering: { verify: true, testCount: 120, requireLaunch: true, c1: true },
      gates: { b1: true, b2: true, b5: null, b14: true },
      season: { ready: true, issues: [], warnings: [] },
      surfaces: { ok: true, issues: [] },
      local: { seed: true, worker: true },
      c2: { ready: true, localOk: true, productionOk: false, humanSignedOff: false },
      c3: { ready: true, localSeedReady: true, productionSeedReady: true, humanSignedOff: false },
      c4: { ready: true, nodeCount: 15, spotCount: 3 },
      blockers: ["C2 GT comprehension"],
    });
    expect(text).toContain("C1 launch gate: ☑");
    expect(text).toContain("C3 install QA");
    expect(text).toContain("C4 prod scan smoke");
    expect(text).toContain("--require-launch");
  });

  it("formats launch preflight report", () => {
    const text = formatLaunchPreflightReport({
      engineering: { verify: true, testCount: 120, requireLaunch: false, c1: null },
      gates: { b1: true, b2: true, b5: null, b14: true },
      season: { ready: true, issues: [], warnings: ["season_root_profile_id not set"] },
      surfaces: { ok: false, issues: ["season_root_profile_id must be set"] },
      local: { seed: true, worker: true },
      c2: { ready: true, localOk: true, productionOk: false, humanSignedOff: false },
      blockers: ["C2 GT comprehension"],
    });
    expect(text).toContain("verify:city-game");
    expect(text).toContain("C1 launch gate");
    expect(text).toContain("B1 vouch copy");
    expect(text).toContain("B14 scan analytics off");
    expect(text).toContain("C2 comprehension");
    expect(text).toContain("city-game:comprehension-preflight");
  });
});
