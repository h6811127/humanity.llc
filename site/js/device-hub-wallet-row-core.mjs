/**
 * Hub saved-row helpers: render from lightweight wallet summary, hydrate full
 * entries only for signing/actions.
 * @see docs/DEVICE_OS_REQUEST_BUDGET.md § Open issues §2
 */

/**
 * @typedef {import("./device-wallet.mjs").WalletSummaryRow} WalletSummaryRow
 */

/**
 * @param {{ owner_private_key_b58?: unknown, hasSigningKeys?: unknown }} entry
 */
export function hubRowHasSigningKeys(entry) {
  return Boolean(entry?.owner_private_key_b58 || entry?.hasSigningKeys);
}

/**
 * Map a summary row to an entry-shaped object for hub DOM (no private keys).
 * @param {WalletSummaryRow} row
 */
export function hubEntryFromSummaryRow(row) {
  return {
    id: row.id ?? `${row.profile_id}_summary`,
    profile_id: row.profile_id,
    label: row.label,
    handle: row.handle,
    qr_id: row.qr_id,
    scan_url: row.scan_url,
    manifesto_line: row.manifesto_line,
    pilot_template: row.pilot_template,
    saved_at: row.saved_at,
    hasSigningKeys: row.hasSigningKeys === true,
  };
}

/**
 * @param {WalletSummaryRow} row
 */
export function walletHaystackFromSummaryRow(row) {
  return [row.label, row.handle, row.manifesto_line, row.profile_id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Minimal row for wallet network status polling (profile + qr only).
 * @param {WalletSummaryRow} row
 */
export function networkPollEntryFromSummaryRow(row) {
  return {
    profile_id: row.profile_id,
    qr_id: row.qr_id ?? null,
    scan_url: row.scan_url,
    id: row.id,
  };
}
