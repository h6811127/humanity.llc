/**
 * Hub card control actions (device layer → /created/ signing surfaces).
 * @see docs/DEVICE_HUB_AND_LOCAL_SEARCH.md Step 7
 */

/** @typedef {'primary' | 'secondary' | 'danger'} HubControlVariant */

/** @typedef {{ id: string, label: string, focus: string, variant: HubControlVariant }} HubCardControl */

/** Controls that stay on the collapsed row (inbox-driven). @see docs/HUB_CARD_ROW_UX.md Phase 2 */
const INLINE_HUB_CONTROL_IDS = new Set(["prove-live"]);

/**
 * @param {HubCardControl[]} controls
 * @returns {{ inline: HubCardControl[], menu: HubCardControl[] }}
 */
export function partitionHubCardControls(controls) {
  /** @type {HubCardControl[]} */
  const inline = [];
  /** @type {HubCardControl[]} */
  const menu = [];
  for (const c of controls) {
    if (INLINE_HUB_CONTROL_IDS.has(c.id)) inline.push(c);
    else menu.push(c);
  }
  return { inline, menu };
}

/**
 * @param {{
 *   hasKeys?: boolean,
 *   pendingLiveProof?: boolean,
 *   scanKind?: string | null,
 * }} ctx
 * @returns {HubCardControl[]}
 */
export function buildHubCardControls(ctx) {
  const hasKeys = ctx.hasKeys === true;
  const pendingLiveProof = ctx.pendingLiveProof === true;
  const scanKind = ctx.scanKind ?? null;
  /** @type {HubCardControl[]} */
  const controls = [];

  if (pendingLiveProof) {
    controls.push({
      id: "prove-live",
      label: "Prove live",
      focus: "live-proof",
      variant: "primary",
    });
  }

  if (!hasKeys) {
    return controls;
  }

  if (scanKind === "card_revoked") {
    controls.push({
      id: "revoke-state",
      label: "Revoke options",
      focus: "revoke",
      variant: "secondary",
    });
    return controls;
  }

  controls.push({
    id: "update-status",
    label: "Update status",
    focus: "update-status",
    variant: pendingLiveProof ? "secondary" : "primary",
  });

  if (scanKind !== "qr_revoked") {
    controls.push({
      id: "revoke-qr",
      label: "Revoke QR",
      focus: "revoke",
      variant: "danger",
    });
    controls.push({
      id: "new-qr",
      label: "New QR",
      focus: "rotate-qr",
      variant: "secondary",
    });
  } else {
    controls.push({
      id: "revoke-card",
      label: "Revoke card",
      focus: "revoke",
      variant: "danger",
    });
    controls.push({
      id: "new-qr",
      label: "New QR",
      focus: "rotate-qr",
      variant: "secondary",
    });
  }

  return controls;
}
