/**
 * Public vouch report intake — target parsing and case mapping.
 * @see docs/VOUCH_TRUST_AND_SAFETY_OPERATOR_WORKFLOW.md § P1
 */

import type { VouchCaseKind } from "./vouch-cases";

export const VOUCH_REPORT_KINDS = [
  "false_vouch",
  "coerced_vouch",
  "statement_abuse",
  "impersonation",
  "stolen_qr_or_artifact",
  "harassment",
  "integrator_misuse",
] as const;

export type VouchReportKind = (typeof VOUCH_REPORT_KINDS)[number];

const PROFILE_ID_PATTERN =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{20,32}$/;

const VOUCH_ID_PATTERN = /^vouch_[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,40}$/;

const OFFICIAL_SCAN_PRODUCTION_HOST = "humanity.llc";
const OFFICIAL_SCAN_LOCAL_HOSTS = ["localhost", "127.0.0.1"];

export interface ParsedVouchReportTarget {
  targetRaw: string;
  profileIds: string[];
  vouchIds: string[];
  scanUrl: string | null;
}

export function isVouchReportKind(value: unknown): value is VouchReportKind {
  return (
    typeof value === "string" &&
    (VOUCH_REPORT_KINDS as readonly string[]).includes(value)
  );
}

function isAllowedScanHost(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === OFFICIAL_SCAN_PRODUCTION_HOST) return true;
  if (hostname.endsWith(".humanity.llc")) return true;
  return OFFICIAL_SCAN_LOCAL_HOSTS.includes(hostname);
}

function profileIdFromScanPath(pathname: string): string | null {
  const match = pathname.match(/^\/c\/([^/]+)\/?$/);
  if (!match?.[1]) return null;
  const profileId = decodeURIComponent(match[1]).trim();
  return PROFILE_ID_PATTERN.test(profileId) ? profileId : null;
}

/**
 * @param {string} raw
 */
export function parseVouchReportTarget(raw: string): ParsedVouchReportTarget | null {
  const targetRaw = raw.trim();
  if (!targetRaw) return null;

  if (VOUCH_ID_PATTERN.test(targetRaw)) {
    return {
      targetRaw,
      profileIds: [],
      vouchIds: [targetRaw],
      scanUrl: null,
    };
  }

  if (PROFILE_ID_PATTERN.test(targetRaw)) {
    return {
      targetRaw,
      profileIds: [targetRaw],
      vouchIds: [],
      scanUrl: null,
    };
  }

  let url: URL;
  try {
    url = new URL(targetRaw);
  } catch {
    return null;
  }

  if (!isAllowedScanHost(url.hostname)) return null;
  const profileId = profileIdFromScanPath(url.pathname);
  if (!profileId) return null;

  return {
    targetRaw,
    profileIds: [profileId],
    vouchIds: [],
    scanUrl: url.href,
  };
}

export function vouchCaseKindFromReportKind(kind: VouchReportKind): VouchCaseKind {
  switch (kind) {
    case "false_vouch":
    case "coerced_vouch":
      return "false_vouch";
    case "statement_abuse":
      return "statement_abuse";
    case "impersonation":
    case "stolen_qr_or_artifact":
      return "impersonation";
    case "harassment":
      return "harassment";
    case "integrator_misuse":
      return "other";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function threatIdsForReportKind(kind: VouchReportKind): string[] {
  switch (kind) {
    case "false_vouch":
      return ["V-06", "H-02"];
    case "coerced_vouch":
      return ["H-01", "V-06"];
    case "statement_abuse":
      return ["V-08"];
    case "impersonation":
      return ["V-07"];
    case "stolen_qr_or_artifact":
      return ["V-04", "A-02"];
    case "harassment":
      return ["V-08", "H-03"];
    case "integrator_misuse":
      return ["I-02"];
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function priorityForReportKind(kind: VouchReportKind): "p0" | "p1" | "p2" {
  if (kind === "impersonation" || kind === "harassment" || kind === "stolen_qr_or_artifact") {
    return "p0";
  }
  if (kind === "integrator_misuse") return "p2";
  return "p1";
}

export function publicReportSourceKey(
  kind: VouchReportKind,
  primaryProfileId: string
): string {
  return `report:${kind}:${primaryProfileId}`;
}

export function summarizePublicReport(
  kind: VouchReportKind,
  statement: string,
  targetRaw: string
): string {
  const lead = kind.replaceAll("_", " ");
  const detail = statement.trim().slice(0, 420);
  const target = targetRaw.trim().slice(0, 80);
  return `Public ${lead} report for ${target}. ${detail}`.slice(0, 500);
}
