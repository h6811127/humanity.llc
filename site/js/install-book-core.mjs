/**
 * Operator install booking — compose a mailto, no checkout, no paywall of create.
 * @see site/install/index.html
 */

export const INSTALL_BOOK_MAILTO = "info@humanity.llc";
export const INSTALL_BOOK_SUBJECT_PREFIX = "Live object install";

/**
 * @param {string[]} labels
 */
export function formatInstallBookRequiredMessage(labels) {
  const unique = [...new Set(labels.filter(Boolean))];
  if (unique.length === 0) return "Required fields are missing.";
  if (unique.length === 1) return `${unique[0]} is required.`;
  if (unique.length === 2) return `${unique[0]} and ${unique[1]} are required.`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]} are required.`;
}

/**
 * @param {{
 *   place?: string,
 *   neighborhood?: string,
 *   scannerLine?: string,
 *   contact?: string,
 * }} fields
 * @returns {Array<{ id: string, label: string }>}
 */
export function listMissingInstallBookFields(fields) {
  /** @type {Array<{ id: string, label: string }>} */
  const missing = [];
  if (!String(fields.place || "").trim()) {
    missing.push({ id: "install-place", label: "Place" });
  }
  if (!String(fields.neighborhood || "").trim()) {
    missing.push({ id: "install-neighborhood", label: "Neighborhood" });
  }
  if (!String(fields.scannerLine || "").trim()) {
    missing.push({ id: "install-scanner-line", label: "What scanners should see" });
  }
  if (!String(fields.contact || "").trim()) {
    missing.push({ id: "install-contact", label: "How to reach you" });
  }
  return missing;
}

/**
 * @param {{
 *   place?: string,
 *   neighborhood?: string,
 *   scannerLine?: string,
 *   contact?: string,
 *   hosted?: boolean,
 * }} fields
 * @returns {{
 *   ok: true,
 *   href: string,
 *   subject: string,
 *   body: string,
 * } | {
 *   ok: false,
 *   message: string,
 *   missingFieldIds: string[],
 * }}
 */
export function buildInstallBookMailto(fields) {
  const missing = listMissingInstallBookFields(fields);
  if (missing.length > 0) {
    return {
      ok: false,
      message: formatInstallBookRequiredMessage(missing.map((m) => m.label)),
      missingFieldIds: missing.map((m) => m.id),
    };
  }
  const place = String(fields.place).trim();
  const neighborhood = String(fields.neighborhood).trim();
  const scannerLine = String(fields.scannerLine).trim();
  const contact = String(fields.contact).trim();
  const hosted = fields.hosted === true;
  const subject = `${INSTALL_BOOK_SUBJECT_PREFIX} — ${place}`;
  const body = [
    `Place: ${place}`,
    `Neighborhood / address: ${neighborhood}`,
    `Scanners should see: ${scannerLine}`,
    `Contact: ${contact}`,
    `Hosted $25/month: ${hosted ? "yes — invoice after install" : "no — plate only"}`,
    "",
    "$250 print + place. Invoice, not a card form. Create stays free.",
  ].join("\n");
  return {
    ok: true,
    subject,
    body,
    href: `mailto:${INSTALL_BOOK_MAILTO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
