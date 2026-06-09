/**
 * Season progressive checklist — three visible steps on Live (Step 20 slice 6).
 * @see docs/STEWARD_UX_PRESENTATION_TARGET.md § Season progressive checklist
 */

import {
  readRememberedGameSeasonId,
  walletEntryHasOrganizerIssuerKey,
} from "./create-organizer-season-core.mjs";

import { findWalletEntryByProfileId } from "./device-wallet.mjs";
import { STEWARD_ROOM_SEASON, stewardPresentationExtras } from "./steward-active-room-core.mjs";

export const SEASON_PROGRESSIVE_CHECKLIST_ID = "created-season-progressive-checklist";

/** @typedef {"identity" | "first_scan_point" | "print"} SeasonProgressiveStepId */

/**
 * @param {unknown[]} rows
 */
export function countRegisteredGameNodes(rows) {
  if (!Array.isArray(rows)) return 0;
  return rows.filter(
    (row) =>
      row &&
      typeof row === "object" &&
      /** @type {Record<string, unknown>} */ (row).object_type === "game_node" &&
      /** @type {Record<string, unknown>} */ (row).status !== "disabled" &&
      /** @type {Record<string, unknown>} */ (row).status !== "revoked"
  ).length;
}

/**
 * @param {unknown[]} rows
 */
export function countGameNodesWithScanUrl(rows) {
  if (!Array.isArray(rows)) return 0;
  return rows.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const r = /** @type {Record<string, unknown>} */ (row);
    if (r.object_type !== "game_node") return false;
    if (r.status === "disabled" || r.status === "revoked") return false;
    const scan = typeof r.scan_url === "string" ? r.scan_url.trim() : "";
    return scan.length > 0;
  }).length;
}

/**
 * @param {{
 *   session?: Record<string, unknown> | null;
 *   walletEntry?: Record<string, unknown> | null;
 *   childObjectRows?: unknown[];
 *   profileId?: string;
 * }} input
 */
export function assessSeasonProgressiveChecklist(input) {
  const session = input.session && typeof input.session === "object" ? input.session : null;
  const walletEntry =
    input.walletEntry && typeof input.walletEntry === "object" ? input.walletEntry : null;
  const identitySource = walletEntry || session;
  const identityDone = walletEntryHasOrganizerIssuerKey(identitySource);
  const gameNodes = countRegisteredGameNodes(input.childObjectRows ?? []);
  const withScan = countGameNodesWithScanUrl(input.childObjectRows ?? []);
  const firstScanDone = gameNodes >= 1;
  const printDone = withScan >= 1;
  const seasonId = readRememberedGameSeasonId(String(input.profileId ?? session?.profile_id ?? ""));

  /** @type {Array<{ id: SeasonProgressiveStepId; label: string; detail: string; done: boolean }>} */
  const steps = [
    {
      id: "identity",
      label: "Identity",
      detail: identityDone
        ? "Season operator key is on this account."
        : "Register a season operator key when you create the season root.",
      done: identityDone,
    },
    {
      id: "first_scan_point",
      label: "First scan point",
      detail: firstScanDone
        ? `${gameNodes} checkpoint${gameNodes === 1 ? "" : "s"} registered.`
        : seasonId
          ? `Name your season in When, then register your first checkpoint (${seasonId}).`
          : "Name your season in When, then register your first checkpoint.",
      done: firstScanDone,
    },
    {
      id: "print",
      label: "Print",
      detail: printDone
        ? "Scan links ready — export print pack or install checklist."
        : "Create a checkpoint QR first, then export stickers from the print pack.",
      done: printDone,
    },
  ];

  const activeStep = steps.find((step) => !step.done) ?? null;

  return {
    steps,
    complete: steps.every((step) => step.done),
    activeStepId: activeStep?.id ?? null,
    gameNodeCount: gameNodes,
    seasonId,
  };
}

/**
 * @param {{
 *   profileId: string;
 *   activeRoom?: string | null;
 * }} ctx
 */
export function shouldShowSeasonProgressiveChecklist(ctx) {
  if (!ctx.profileId) return false;
  const presentation = stewardPresentationExtras(ctx.profileId, {
    activeRoom: ctx.activeRoom,
    walletEntry: findWalletEntryByProfileId(ctx.profileId),
  });
  return presentation.activeRoom === STEWARD_ROOM_SEASON;
}
