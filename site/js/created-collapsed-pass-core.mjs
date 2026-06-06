/**
 * Collapsed legacy pass detection for /created/ Collection routing (PR 1).
 */

import {
  childObjectManifestoLine,
  inferPilotTemplate,
  parseDisplayFromChildObject,
  parseManifestoDisplay,
} from "./manifesto-display.mjs";

export const CREATED_COLLAPSED_PASS_QUERY = "collapsed";

/**
 * @param {Record<string, unknown>} row
 */
function isActiveChildRow(row) {
  return row?.status !== "disabled";
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @param {Record<string, unknown>} childRow
 */
export function isLegacyFlatChildMatch(session, childRow) {
  const manifestoLine =
    typeof session?.manifesto_line === "string" ? session.manifesto_line.trim() : "";
  if (!manifestoLine) return false;

  const parsed = parseManifestoDisplay(manifestoLine);
  if (parsed.kind !== "status_plate" && parsed.kind !== "lost_item_relay") {
    return false;
  }

  const explicitPilot =
    typeof session?.pilot_template === "string" ? session.pilot_template.trim() : "";
  if (explicitPilot === "status_plate" || explicitPilot === "lost_item_relay") {
    return true;
  }

  const childManifesto = childObjectManifestoLine(
    /** @type {{ object_type: string; public_label: string; public_state: string }} */ (
      childRow
    )
  );
  if (childManifesto.trim() === manifestoLine) return true;

  const fromChild = parseDisplayFromChildObject(
    /** @type {{ object_type: string; public_label: string; public_state: string }} */ (
      childRow
    )
  );
  if (!fromChild) return false;
  if (parsed.kind === "status_plate" && fromChild.kind === "status_plate") {
    return (
      parsed.objectLabel === fromChild.objectLabel &&
      parsed.statusLine === fromChild.statusLine
    );
  }
  if (parsed.kind === "lost_item_relay" && fromChild.kind === "lost_item_relay") {
    return (
      parsed.objectLabel === fromChild.objectLabel &&
      parsed.statusLine === fromChild.statusLine
    );
  }
  return false;
}

/**
 * @param {Record<string, unknown> | null | undefined} session
 * @returns {"status_plate" | "lost_item_relay" | null}
 */
function flatPilotKindFromSession(session) {
  const explicitPilot =
    typeof session?.pilot_template === "string" ? session.pilot_template.trim() : "";
  if (explicitPilot === "status_plate" || explicitPilot === "lost_item_relay") {
    return explicitPilot;
  }
  const manifestoLine =
    typeof session?.manifesto_line === "string" ? session.manifesto_line : "";
  const inferred = inferPilotTemplate(manifestoLine);
  if (inferred === "status_plate" || inferred === "lost_item_relay") {
    return inferred;
  }
  return null;
}

/**
 * @param {{
 *   searchParams?: Pick<URLSearchParams, "get"> | null;
 *   session?: Record<string, unknown> | null;
 *   childRows?: Record<string, unknown>[];
 * }} input
 */
export function isCollapsedPassRoot(input) {
  if (input.searchParams?.get(CREATED_COLLAPSED_PASS_QUERY) === "1") return true;

  const rows = Array.isArray(input.childRows) ? input.childRows : [];
  const active = rows.filter(isActiveChildRow);
  const flatPilot = flatPilotKindFromSession(input.session);

  if (active.length === 0 && flatPilot) return true;

  if (active.length === 1 && isLegacyFlatChildMatch(input.session, active[0])) {
    return true;
  }

  return false;
}
