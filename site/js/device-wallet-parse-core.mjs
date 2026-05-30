/**
 * Classify `hc_wallet` localStorage payload (R7 · Safari P1-4).
 * @see docs/SAFARI_KEYS_CUSTODY.md R7
 */

/** @typedef {"empty" | "ok" | "corrupt"} WalletParseKind */

/**
 * @param {string | null} raw
 * @returns {{ kind: WalletParseKind, entries?: Array<Record<string, unknown>> }}
 */
export function classifyWalletStorageRaw(raw) {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) {
    return { kind: "empty", entries: [] };
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return { kind: "corrupt" };
    }
    return { kind: "ok", entries: parsed };
  } catch {
    return { kind: "corrupt" };
  }
}
