/**
 * Pure helpers for hub backup import (Vitest without DOM).
 */

/**
 * @param {Array<Record<string, unknown>>} entries
 * @param {{
 *   profileId: string;
 *   publicKeyBase58: string;
 *   privateKeyBase58: string;
 * }} unlocked
 * @param {string} defaultScanUrl
 * @param {string} [importedAt]
 */
export function mergeBackupIntoWallet(entries, unlocked, defaultScanUrl, importedAt = new Date().toISOString()) {
  const idx = entries.findIndex((e) => e.profile_id === unlocked.profileId);
  if (idx >= 0) {
    const entry = {
      ...entries[idx],
      owner_public_key_b58: unlocked.publicKeyBase58,
      owner_private_key_b58: unlocked.privateKeyBase58,
      saved_at: importedAt,
      key_imported_at: importedAt,
    };
    const next = entries.slice();
    next[idx] = entry;
    return { entries: next, entry, isNew: false };
  }
  const entry = {
    profile_id: unlocked.profileId,
    owner_public_key_b58: unlocked.publicKeyBase58,
    owner_private_key_b58: unlocked.privateKeyBase58,
    scan_url: defaultScanUrl,
    saved_at: importedAt,
    key_imported_at: importedAt,
  };
  return { entries: [entry, ...entries], entry, isNew: true };
}
