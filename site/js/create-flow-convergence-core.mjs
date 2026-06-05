/**
 * Create flow convergence — nudge stewards toward general root + Add object on /created/.
 * @see docs/ROOT_CARD_AND_CHILD_OBJECTS.md § Implementation sequence step 14
 */

import { isGeneralRootWalletEntry } from "./hub-child-object-row-core.mjs";
import { walletEntryHasSigningMaterial } from "./device-tab-session-core.mjs";

export const ADD_STATUS_PLATE_FOCUS = "add-status-plate";
export const ADD_LOST_ITEM_FOCUS = "add-lost-item";

/** @typedef {"status_plate" | "lost_item_relay"} PilotObjectTemplate */

/**
 * @param {string | null | undefined} template
 * @returns {PilotObjectTemplate | null}
 */
export function normalizePilotObjectTemplate(template) {
  if (template === "lost_item") return "lost_item_relay";
  if (template === "status_plate" || template === "lost_item_relay") return template;
  return null;
}

/**
 * @param {string | null | undefined} template
 */
export function isPilotObjectTemplate(template) {
  return normalizePilotObjectTemplate(template) != null;
}

/**
 * @param {Record<string, unknown> | null | undefined} entry
 */
export function walletEntryHasSigningKeys(entry) {
  return walletEntryHasSigningMaterial(entry);
}

/**
 * @param {unknown[]} walletEntries
 */
export function listGeneralRootsWithKeys(walletEntries) {
  if (!Array.isArray(walletEntries)) return [];
  return walletEntries.filter(
    (entry) => isGeneralRootWalletEntry(entry) && walletEntryHasSigningKeys(entry)
  );
}

/**
 * @param {unknown[]} walletEntries
 */
export function pickPreferredGeneralRoot(walletEntries) {
  const roots = listGeneralRootsWithKeys(walletEntries);
  return roots[0] ?? null;
}

/**
 * @param {PilotObjectTemplate | string | null | undefined} template
 */
export function createdAddObjectFocus(template) {
  const normalized = normalizePilotObjectTemplate(template);
  if (normalized === "status_plate") return ADD_STATUS_PLATE_FOCUS;
  if (normalized === "lost_item_relay") return ADD_LOST_ITEM_FOCUS;
  return null;
}

/**
 * @param {Record<string, unknown>} entry
 */
function walletEntryQrId(entry) {
  const direct = typeof entry.qr_id === "string" ? entry.qr_id.trim() : "";
  if (direct) return direct;
  const scanUrl = typeof entry.scan_url === "string" ? entry.scan_url.trim() : "";
  if (!scanUrl) return "";
  try {
    const url = new URL(scanUrl, "https://humanity.llc");
    return url.searchParams.get("q")?.trim() || "";
  } catch {
    return "";
  }
}

/**
 * @param {Record<string, unknown>} entry
 * @param {PilotObjectTemplate | string} template
 * @param {string} [origin]
 */
export function createdAddObjectHref(entry, template, origin = "https://humanity.llc") {
  const focus = createdAddObjectFocus(template);
  if (!entry?.profile_id || !focus) return null;
  const url = new URL("/created/", origin);
  url.searchParams.set("profile_id", String(entry.profile_id));
  const qrId = walletEntryQrId(entry);
  if (qrId) url.searchParams.set("qr_id", qrId);
  url.hash = focus;
  return url.pathname + url.search + url.hash;
}

/**
 * @param {Record<string, unknown>} entry
 */
export function generalRootDisplayLabel(entry) {
  const handle = typeof entry.handle === "string" ? entry.handle.trim().replace(/^@/, "") : "";
  if (handle) return `@${handle}`;
  const label = typeof entry.label === "string" ? entry.label.trim() : "";
  if (label) return label;
  const profileId = typeof entry.profile_id === "string" ? entry.profile_id : "";
  return profileId ? `${profileId.slice(0, 12)}…` : "your root card";
}

/**
 * @param {PilotObjectTemplate} template
 * @param {{ preferredRoot: Record<string, unknown> | null, rootCount: number }} ctx
 */
export function createConvergenceNudgeCopy(template, ctx) {
  const objectLabel = template === "status_plate" ? "sign" : "return tag";
  const addVerb = template === "status_plate" ? "Add sign" : "Add return tag";
  const focusLabel =
    template === "status_plate" ? "Add sign on Live" : "Add return tag on Live";

  if (ctx.preferredRoot) {
    const rootLabel = generalRootDisplayLabel(ctx.preferredRoot);
    const openLabel =
      template === "status_plate"
        ? `Open ${rootLabel} to add sign`
        : `Open ${rootLabel} to add return tag`;
    return {
      title: `${addVerb} under your saved @handle`,
      body:
        ctx.rootCount > 1
          ? `Recommended: use ${rootLabel}. Add this ${objectLabel} on Live instead of creating a second @handle.`
          : `Recommended: use ${rootLabel}. Add this ${objectLabel} on Live instead of creating again.`,
      primaryLabel: openLabel,
      primaryHref: null,
      showGeneralSwitch: true,
      collapseLegacyForm: true,
      focusLabel,
    };
  }

  return {
    title: "Pick your @handle first",
    body: `Then ${addVerb.toLowerCase()} from Live. Use the field-kit option below only if you need a separate @handle.`,
    primaryLabel: "Start with your @handle",
    primaryHref: null,
    showGeneralSwitch: true,
    collapseLegacyForm: false,
    focusLabel,
  };
}
