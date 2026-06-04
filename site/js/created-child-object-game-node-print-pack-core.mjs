/**
 * Phase E — print / install pack export (node list, QR filenames, install checklist).
 * @see docs/CITY_GAME_V1_IMPLEMENTATION.md § Phase E · Print / install pack
 */

import { isActiveGameNodeRow } from "./created-child-object-game-node-core.mjs";
import { resolveSeasonTemplateRows } from "./city-game-season-template-core.mjs";

/**
 * @param {string} nodeId
 */
function nodeSortKey(nodeId) {
  const match = String(nodeId).match(/^node_(\d+)$/);
  return match ? Number(match[1]) : 999;
}

/**
 * @param {unknown} row
 */
function readScanUrl(row) {
  return typeof row?.scan_url === "string" ? row.scan_url.trim() : "";
}

/**
 * @param {unknown} row
 */
function readQrId(row) {
  return typeof row?.qr_id === "string" ? row.qr_id.trim() : "";
}

/**
 * @param {Array<Record<string, unknown>>} registeredRows
 * @param {Array<{ node_id: string; label: string; role?: string; district?: string | null; object_id: string }>} [templateRows]
 */
export function buildInstallPackRows(registeredRows, templateRows = []) {
  const active = registeredRows.filter(isActiveGameNodeRow);
  const templateByObjectId = new Map(
    templateRows.map((row) => [String(row.object_id ?? "").trim(), row]).filter(([id]) => id)
  );
  const usedTemplateIds = new Set();

  /** @type {Array<{ node_id: string; label: string; role: string; district: string; object_id: string; qr_id: string; scan_url: string; qr_issued: boolean }>} */
  const rows = active.map((row, index) => {
    const objectId = String(row.object_id ?? "").trim();
    const template = templateByObjectId.get(objectId);
    if (template) usedTemplateIds.add(objectId);
    const nodeId = template?.node_id ?? `extra_${String(index + 1).padStart(2, "0")}`;
    const scanUrl = readScanUrl(row);
    const qrId = readQrId(row);
    return {
      node_id: nodeId,
      label:
        (typeof row.public_label === "string" && row.public_label.trim()) ||
        template?.label ||
        nodeId,
      role: template?.role ?? "game_node",
      district: template?.district ?? "",
      object_id: objectId,
      qr_id: qrId,
      scan_url: scanUrl,
      qr_issued: scanUrl.length > 0 && qrId.length > 0,
    };
  });

  for (const template of templateRows) {
    const objectId = String(template.object_id ?? "").trim();
    if (!objectId || usedTemplateIds.has(objectId)) continue;
    rows.push({
      node_id: template.node_id,
      label: template.label,
      role: template.role ?? "relay_gate",
      district: template.district ?? "",
      object_id: objectId,
      qr_id: "",
      scan_url: "",
      qr_issued: false,
    });
  }

  return rows.sort((a, b) => nodeSortKey(a.node_id) - nodeSortKey(b.node_id));
}

/**
 * @param {ReturnType<typeof buildInstallPackRows>} rows
 */
export function assessInstallPackReady(rows) {
  const issues = [];
  if (!rows.length) {
    issues.push("Register at least one game node before exporting an install pack.");
    return { ready: false, issues, withQr: 0, total: 0, missingQr: [] };
  }
  const withQr = rows.filter((row) => row.qr_issued).length;
  const missingQr = rows.filter((row) => !row.qr_issued).map((row) => row.node_id);
  if (withQr === 0) {
    issues.push("Issue scan QRs for registered nodes before printing stickers.");
  } else if (missingQr.length) {
    issues.push(
      `${missingQr.length} node${missingQr.length === 1 ? "" : "s"} still missing scan QRs (${missingQr.slice(0, 5).join(", ")}${missingQr.length > 5 ? "…" : ""}).`
    );
  }
  return {
    ready: withQr > 0,
    issues,
    withQr,
    total: rows.length,
    missingQr,
  };
}

/**
 * @param {ReturnType<typeof buildInstallPackRows>} rows
 */
export function buildInstallPackCsv(rows) {
  const header = ["node_id", "label", "district", "role", "object_id", "qr_id", "scan_url", "qr_issued"];
  const escape = (value) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.node_id,
        row.label,
        row.district,
        row.role,
        row.object_id,
        row.qr_id,
        row.scan_url,
        row.qr_issued ? "yes" : "no",
      ]
        .map(escape)
        .join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

/**
 * @param {{
 *   seasonId?: string;
 *   seasonTitle?: string;
 *   profileId?: string;
 *   city?: string;
 * }} ctx
 * @param {ReturnType<typeof buildInstallPackRows>} rows
 */
export function buildInstallChecklistText(ctx, rows) {
  const seasonId = ctx.seasonId?.trim() || "season";
  const title = ctx.seasonTitle?.trim() || seasonId;
  const profileId = ctx.profileId?.trim() || "(season root profile_id)";
  const city = ctx.city?.trim() || "";
  const assessment = assessInstallPackReady(rows);

  const lines = [
    `# Install pack — ${title}`,
    "",
    `Season id: ${seasonId}`,
    ...(city ? [`City: ${city}`] : []),
    `Season root profile_id: ${profileId}`,
    `Nodes with scan QRs: ${assessment.withQr} / ${assessment.total}`,
    "",
    "Stickers must match the scan_url in each row. Re-mint or issue-qr without reprint invalidates old QRs.",
    "",
    "| node_id | Label | District | QR issued? | scan_url |",
    "|---------|-------|----------|------------|----------|",
  ];

  for (const row of rows) {
    const url = row.scan_url || "—";
    lines.push(
      `| ${row.node_id} | ${row.label.replace(/\|/g, "\\|")} | ${row.district || "—"} | ${row.qr_issued ? "☑" : "☐"} | ${url} |`
    );
  }

  lines.push(
    "",
    "## Install QA (physical)",
    "- [ ] Record steward contacts for care-loop nodes before opening the season",
    "- [ ] Print QR PNGs from this pack (or download per row below) — not from an old folder",
    "- [ ] Spot-scan node_01, a quorum node, and a trust-path node on ≥3 phones",
    "- [ ] Confirm scan copy matches rules page — no leaderboard or player accounts",
    "",
    "Export generated from /created/ · Manage · Print / install pack."
  );

  return lines.join("\n");
}

/**
 * @param {string} seasonId
 * @param {string} nodeId
 */
export function installPackQrFilename(seasonId, nodeId) {
  const safeSeason = String(seasonId ?? "season")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const safeNode = String(nodeId ?? "node")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `humanity-${safeSeason}-${safeNode}-qr.png`;
}

/**
 * @param {string} seasonId
 */
export function installPackCsvFilename(seasonId) {
  const safeSeason = String(seasonId ?? "season")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `humanity-${safeSeason}-install-pack.csv`;
}

/**
 * @param {Record<string, unknown> | null | undefined} seasonBody
 * @param {string} seasonId
 * @param {Array<Record<string, unknown>>} registeredRows
 */
export function resolveInstallPackRows(seasonBody, seasonId, registeredRows) {
  const templateRows = resolveSeasonTemplateRows(seasonBody, seasonId);
  return buildInstallPackRows(registeredRows, templateRows);
}

/**
 * @param {ReturnType<typeof assessInstallPackReady>} assessment
 */
export function installPackSummaryCopy(assessment) {
  if (!assessment.total) {
    return "Register game nodes on Live, then export scan links and QR PNGs for install QA.";
  }
  if (assessment.withQr === assessment.total) {
    return `${assessment.withQr} node${assessment.withQr === 1 ? "" : "s"} ready — export CSV, QR PNGs, and install checklist.`;
  }
  return `${assessment.withQr} / ${assessment.total} nodes have scan QRs — issue missing links before printing stickers.`;
}
