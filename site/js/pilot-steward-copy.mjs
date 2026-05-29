/**
 * Plain-language steward copy per pilot template (Step 5).
 * Precise protocol terms stay in Advanced / resolver panels.
 * @see docs/PRODUCT_POSITIONING_AND_LOOP_STRATEGY.md § Step 5
 * @see docs/PRODUCT_LANGUAGE_STRATEGY.md
 */

/** @typedef {"general" | "status_plate" | "lost_item_relay"} PilotTemplate */

/** @typedef {{
 *   scannersSeeTitle: string;
 *   scannersSeeLead: string;
 *   publishBtn: string;
 *   revokeSummaryTitle: string;
 *   revokeQrBtn: string;
 *   revokeConfirmQr: string;
 *   revokeNetworkLead: string;
 *   hubUpdateStatus: string;
 *   hubRevokeQr: string;
 *   hubRevokeCard: string;
 * }} PilotStewardCopy
 */

/** @type {Record<PilotTemplate, PilotStewardCopy>} */
export const PILOT_STEWARD_COPY = {
  general: {
    scannersSeeTitle: "What scanners see",
    scannersSeeLead: "Same QR. Updates on the next scan.",
    publishBtn: "Publish update",
    revokeSummaryTitle: "Revoke this QR",
    revokeQrBtn: "Revoke this QR",
    revokeConfirmQr: "I understand — revoke this scan QR only",
    revokeNetworkLead:
      "What scanners see right now — fetched live, not guessed from this tab.",
    hubUpdateStatus: "Update status",
    hubRevokeQr: "Revoke QR",
    hubRevokeCard: "Revoke card",
  },
  status_plate: {
    scannersSeeTitle: "What people see when they scan",
    scannersSeeLead: "Same tag on the door. Updates on the next scan.",
    publishBtn: "Publish status update",
    revokeSummaryTitle: "Turn off this tag",
    revokeQrBtn: "Turn off this tag",
    revokeConfirmQr: "I understand — this turns off the tag scan only",
    revokeNetworkLead:
      "What the plate shows right now — fetched live from the network.",
    hubUpdateStatus: "Update plate status",
    hubRevokeQr: "Turn off tag",
    hubRevokeCard: "Disable plate",
  },
  lost_item_relay: {
    scannersSeeTitle: "What finders see when they scan",
    scannersSeeLead: "Same tag on the item. Updates on the next scan.",
    publishBtn: "Publish return message",
    revokeSummaryTitle: "Turn off this relay",
    revokeQrBtn: "Turn off this relay",
    revokeConfirmQr: "I understand — this turns off the finder relay only",
    revokeNetworkLead:
      "What finders see right now — fetched live from the network.",
    hubUpdateStatus: "Update return message",
    hubRevokeQr: "Turn off relay",
    hubRevokeCard: "Disable relay card",
  },
};

/**
 * @param {string | null | undefined} pilot
 * @returns {PilotTemplate}
 */
export function normalizePilotTemplate(pilot) {
  if (pilot === "status_plate" || pilot === "lost_item_relay") return pilot;
  return "general";
}

/**
 * @param {string | null | undefined} pilot
 * @returns {PilotStewardCopy}
 */
export function stewardCopyForPilot(pilot) {
  return PILOT_STEWARD_COPY[normalizePilotTemplate(pilot)];
}

/**
 * @param {string | null | undefined} text
 * @param {HTMLElement | null | undefined} el
 */
function setText(el, text) {
  if (el && typeof text === "string") el.textContent = text;
}

/**
 * Apply plain-language labels on /created/ for the active pilot.
 * @param {string | null | undefined} pilot
 */
export function syncCreatedPilotStewardCopy(pilot) {
  const copy = stewardCopyForPilot(pilot);

  setText(document.getElementById("created-live-scanners-see-title"), copy.scannersSeeTitle);
  setText(document.querySelector("#created-live-scanners-see .created-live-scanners-see-lead"), copy.scannersSeeLead);
  setText(document.getElementById("manifesto-update-submit"), copy.publishBtn);
  setText(document.getElementById("revoke-summary-title"), copy.revokeSummaryTitle);
  setText(document.getElementById("revoke-qr-btn"), copy.revokeQrBtn);

  const confirmLabel = document.querySelector("label.revoke-confirm span");
  setText(confirmLabel, copy.revokeConfirmQr);

  setText(document.querySelector("#owner-network-status .owner-network-status-lead"), copy.revokeNetworkLead);
}

/**
 * @param {string} scanKind
 * @param {string} cardStatus
 * @param {string} qrStatus
 * @param {string | null | undefined} pilot
 * @returns {string}
 */
export function formatRevokeSummarySub(scanKind, cardStatus, qrStatus, pilot) {
  const p = normalizePilotTemplate(pilot);
  if (p === "status_plate") {
    if (scanKind === "active") return "Plate is live — scans show your status line.";
    if (scanKind === "qr_revoked") return "Tag scan is off — the printed URL stays the same.";
    if (scanKind === "card_revoked") return "Plate disabled — all scans show inactive.";
    return `Plate scan: ${scanKind.replace(/_/g, " ")}`;
  }
  if (p === "lost_item_relay") {
    if (scanKind === "active") return "Relay is live — finders see your return message.";
    if (scanKind === "qr_revoked") return "Relay is off — the printed tag URL stays the same.";
    if (scanKind === "card_revoked") return "Relay card disabled.";
    return `Relay scan: ${scanKind.replace(/_/g, " ")}`;
  }
  const cardLine = cardStatus || "unknown";
  const qrLine = qrStatus || "unknown";
  if (scanKind === "active") return `Scans resolve as active · Card ${cardLine} · QR ${qrLine}`;
  if (scanKind === "qr_revoked") return `Scans show this QR revoked · Card ${cardLine} · QR ${qrLine}`;
  if (scanKind === "card_revoked") return `Scans show card disabled · Card ${cardLine} · QR ${qrLine}`;
  return `Scans resolve as: ${scanKind} · Card ${cardLine} · QR ${qrLine}`;
}

/**
 * @param {string | null | undefined} pilot
 * @param {string} scanKind
 * @returns {string | null}
 */
export function revokeNetworkHintForPilot(pilot, scanKind) {
  const p = normalizePilotTemplate(pilot);
  if (p === "status_plate") {
    if (scanKind === "active") {
      return "Turning off the tag changes what scans show. The sticker URL stays the same.";
    }
    if (scanKind === "qr_revoked") {
      return "This tag scan is already off. You can still disable the whole plate below.";
    }
    if (scanKind === "card_revoked") {
      return "This plate is disabled on the network.";
    }
    return null;
  }
  if (p === "lost_item_relay") {
    if (scanKind === "active") {
      return "Turning off the relay changes what finders see. The tag URL stays the same.";
    }
    if (scanKind === "qr_revoked") {
      return "This relay is already off. You can still disable the whole card below.";
    }
    return null;
  }
  return null;
}

/**
 * @param {Array<{ id: string, label: string }>} controls
 * @param {string | null | undefined} pilot
 */
export function applyHubControlPlainLabels(controls, pilot) {
  const copy = stewardCopyForPilot(pilot);
  return controls.map((c) => {
    if (c.id === "update-status") return { ...c, label: copy.hubUpdateStatus };
    if (c.id === "revoke-qr") return { ...c, label: copy.hubRevokeQr };
    if (c.id === "revoke-card") return { ...c, label: copy.hubRevokeCard };
    return c;
  });
}
