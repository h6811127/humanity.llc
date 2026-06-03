/**
 * WS-REV R4 — M4 governance sign-off helpers (record in canonical docs).
 * @see docs/HOSTED_TIER_PRICING_AND_SLA.md § Governance checklist
 * @see docs/HOSTED_TIER_M4_GOVERNANCE_BRIEF.md
 */

export const HOSTED_PRICING_DOC_REL = "docs/HOSTED_TIER_PRICING_AND_SLA.md";
export const PAID_TIER_DOC_REL = "docs/PAID_TIER_AND_HOSTED_OPERATOR_PLAN.md";
export const COORDINATION_DOC_REL = "docs/PRODUCT_WORKSTREAM_COORDINATION.md";
export const M4_BRIEF_DOC_REL = "docs/HOSTED_TIER_M4_GOVERNANCE_BRIEF.md";

/** Marker replaced on `npm run hosted:rev:m4-sign-off -- --pass --apply`. */
export const WS_REV_R4_SIGNOFF_PENDING =
  "WS-REV-R4-SIGNOFF-PENDING — governance records WS-REV revenue path (R1–R3 shipped); public launch date TBD";

export const WS_REV_R4_ALREADY_PASSED = "WS-REV R4 governance sign-off **recorded**";

/**
 * @param {string[]} argv
 */
export function parseHostedRevM4SignOffArgs(argv) {
  const pass = argv.includes("--pass");
  const fail = argv.includes("--fail");
  const apply = argv.includes("--apply");
  let dateIso = new Date().toISOString().slice(0, 10);
  let note = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date" && argv[i + 1]) {
      dateIso = argv[++i];
    } else if (arg === "--note" && argv[i + 1]) {
      note = argv[++i];
    }
  }

  return { pass, fail, apply, dateIso, note };
}

/**
 * @param {{ pass: boolean; fail: boolean }} parsed
 */
export function resolveHostedRevM4SignOffResult(parsed) {
  if (parsed.pass && parsed.fail) {
    throw new Error("Use only one of --pass or --fail");
  }
  if (!parsed.pass && !parsed.fail) {
    throw new Error("Specify --pass or --fail");
  }
  return parsed.pass ? "pass" : "fail";
}

/**
 * @param {{
 *   dateIso: string;
 *   note?: string;
 *   result: "pass" | "fail";
 * }} input
 * @returns {string[]}
 */
export function hostedRevM4SignOffSummaryLines(input) {
  const lines = [
    "WS-REV R4 — M4 governance sign-off (revenue path)",
    "",
    `  Date:   ${input.dateIso}`,
    `  Note:   ${input.note || "(solo founder — WS-REV R1–R3 engineering complete)"}`,
    `  Result: ${input.result === "pass" ? "PASS" : "FAIL"}`,
    "",
  ];
  if (input.result === "pass") {
    lines.push(
      "On pass with --apply: updates HOSTED_TIER_PRICING_AND_SLA.md, PAID_TIER plan, coordination changelog.",
      "Preflight (engineering): npm run hosted:rev:m4:preflight",
      "Production: npm run hosted:rev:r3 then --paid after Stripe test checkout"
    );
  } else {
    lines.push(
      "On fail: do not mark R4 passed; resolve governance blockers in HOSTED_TIER_M4_GOVERNANCE_BRIEF.md"
    );
  }
  lines.push("");
  return lines;
}

/**
 * @param {string} content
 * @param {{ dateIso: string; note?: string }} opts
 */
export function applyHostedTierPricingWsRevR4Pass(content, opts) {
  if (!content.includes(WS_REV_R4_SIGNOFF_PENDING)) {
    if (content.includes(WS_REV_R4_ALREADY_PASSED)) {
      throw new Error("hosted_rev_r4_already_passed");
    }
    throw new Error("hosted_rev_r4_pending_marker_missing");
  }

  const noteSuffix = opts.note ? ` — ${opts.note}` : "";
  let next = content.replace(
    WS_REV_R4_SIGNOFF_PENDING,
    `${WS_REV_R4_ALREADY_PASSED} (${opts.dateIso}${noteSuffix})`
  );

  next = next.replace(
    "| G8 | Payment provider | Stripe pending approval | Ops |",
    "| G8 | Payment provider | **Stripe** — reference operator Checkout + webhooks (test mode → prod secrets) | Ops |"
  );

  next = next.replace(
    "**Engineering status (2026-05-27):** E1–E6 code complete in staging.",
    "**Engineering status (2026-06-03):** WS-REV **R1–R3 shipped** — Checkout session API, `/created/` caps UI, `hosted:rev:prod-smoke`. E1–E6 + game season `0031` in staging/production path."
  );

  if (!next.includes("| G11 |")) {
    const wsRevRows =
      "| G11 | SKU `hosted_game_season_v1` | Separate from steward; price band TBD | Product |\n" +
      "| G12 | /created/ upgrade UX | Capacity-only copy; no verification upsell | Product |\n" +
      "| G13 | Commerce firewall | Merch/checkout must not set `metadata.account_id` for hosted grant | Ops |\n";
    const g10Row = next.match(/\| G10 \|[^\n]*\n/);
    if (g10Row) {
      next = next.replace(g10Row[0], g10Row[0] + wsRevRows);
    }
  }

  const changelogRow = `| ${opts.dateIso} | **WS-REV R4** — governance sign-off recorded (G8 Stripe Checkout path; G11–G13); Legal still pending G7 |\n`;
  if (!next.includes("**WS-REV R4**")) {
    next = next.replace(
      "| 2026-05-27 | **G0 signed** (Governance + Ops, solo founder); Legal pending for G7 |",
      `| 2026-05-27 | **G0 signed** (Governance + Ops, solo founder); Legal pending for G7 |\n${changelogRow}`
    );
  }

  return next;
}

/**
 * @param {string} content
 */
export function applyPaidTierWsRevR4Pass(content) {
  const openLine =
    "**Open (WS-REV):** Stripe products/prices, checkout return URLs, `/created/` upgrade panels, M4 pricing sign-off ([`HOSTED_TIER_PRICING_AND_SLA.md`](HOSTED_TIER_PRICING_AND_SLA.md)).";
  const shippedLine =
    "**WS-REV shipped (repo):** Stripe Checkout (`POST …/steward/billing/checkout`), webhook `plan_id`, `/created/` Operator plan & limits panel. **Still open:** exact USD in Stripe Dashboard, public marketing launch date, Legal G7 refund copy.";
  if (!content.includes(openLine)) {
    if (content.includes("**WS-REV shipped (repo):**")) {
      return content;
    }
    throw new Error("paid_tier_ws_rev_open_line_missing");
  }
  return content.replace(openLine, shippedLine);
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyCoordinationWsRevR4Changelog(content, opts) {
  const row = `| ${opts.dateIso} | **WS-REV R4** — M4 governance sign-off recorded (G8 Stripe + G11–G13); WS-REV stream complete pending prod \`--paid\` smoke + public launch |`;
  if (content.includes("**WS-REV R4** — M4 governance sign-off recorded")) {
    return content;
  }
  return content.replace(
    "## Changelog (coordination log)",
    `## Changelog (coordination log)\n\n${row}`
  );
}

/**
 * @param {string} content
 * @param {{ dateIso: string }} opts
 */
export function applyM4BriefWsRevR4Note(content, opts) {
  const note = `| ${opts.dateIso} | **WS-REV R4** — revenue governance recorded; G8 Stripe Checkout path approved for reference operator (test → prod secrets) |`;
  if (content.includes("**WS-REV R4**")) {
    return content;
  }
  return content.replace(
    "| 2026-05-27 | **G0 signed** (Governance + Ops); Legal pending |",
    `| 2026-05-27 | **G0 signed** (Governance + Ops); Legal pending |\n${note}`
  );
}
