/**
 * Hub wallet custody debug snapshot (monitoring — RC catalog close-out).
 * @see docs/HUB_CARD_DISAPPEARED_SAFARI_INVESTIGATION.md § Diagnostic checklist
 */

/**
 * @param {string | null | undefined} raw
 * @returns {{ parse: "ok" | "corrupt"; wallet: unknown[] | null }}
 */
export function parseWalletStorageForDebug(raw) {
  if (!raw) return { parse: "ok", wallet: null };
  try {
    const wallet = JSON.parse(raw);
    if (!Array.isArray(wallet)) return { parse: "corrupt", wallet: null };
    return { parse: "ok", wallet };
  } catch {
    return { parse: "corrupt", wallet: null };
  }
}

/**
 * @param {unknown[] | null} wallet
 */
export function hubWalletDebugProfileRows(wallet) {
  if (!Array.isArray(wallet)) return null;
  return wallet.map((entry) => {
    const row = entry && typeof entry === "object" ? /** @type {Record<string, unknown>} */ (entry) : {};
    return {
      id: row.profile_id,
      handle: row.handle,
      hasKey: Boolean(row.owner_private_key_b58),
      saved_at: row.saved_at,
    };
  });
}

/**
 * @param {{
 *   walletRaw?: string | null;
 *   summaryRaw?: string | null;
 *   createdRaw?: string | null;
 *   autoSaveFailed?: string | null;
 *   persistFlag?: string | null;
 *   removedRaw?: string | null;
 *   standalone?: boolean;
 *   origin?: string;
 * }} input
 */
export function gatherHubWalletDebugSnapshot(input) {
  const {
    walletRaw = null,
    summaryRaw = null,
    createdRaw = null,
    autoSaveFailed = null,
    persistFlag = null,
    removedRaw = null,
    standalone = false,
    origin = "",
  } = input;

  const { parse, wallet } = parseWalletStorageForDebug(walletRaw);
  let sessionHasKey = false;
  if (createdRaw) {
    try {
      const session = JSON.parse(createdRaw);
      sessionHasKey = Boolean(session?.owner_private_key_b58);
    } catch {
      sessionHasKey = false;
    }
  }

  return {
    walletParse: parse,
    walletBytes: walletRaw ? walletRaw.length : 0,
    walletCount: Array.isArray(wallet) ? wallet.length : null,
    profiles: hubWalletDebugProfileRows(wallet),
    summaryBytes: summaryRaw ? summaryRaw.length : 0,
    sessionHasKey,
    autoSaveFailed,
    persistFlag,
    removed: removedRaw,
    standalone,
    origin,
  };
}

/**
 * @param {ReturnType<typeof gatherHubWalletDebugSnapshot>} snapshot
 * @returns {string[]}
 */
export function suggestHubDisappearanceRcs(snapshot) {
  const rcs = [];
  if (
    (snapshot.walletCount === 0 || snapshot.walletCount === null) &&
    snapshot.walletBytes === 0
  ) {
    rcs.push("RC-3", "RC-4", "RC-5", "RC-21");
  }
  if (snapshot.walletParse === "corrupt") {
    rcs.push("RC-7");
  }
  if (typeof snapshot.walletCount === "number" && snapshot.walletCount >= 1) {
    rcs.push("RC-14", "RC-15", "RC-16");
  }
  if (
    typeof snapshot.walletCount === "number" &&
    snapshot.walletCount >= 1 &&
    !snapshot.sessionHasKey
  ) {
    rcs.push("RC-8", "RC-20");
  }
  if (snapshot.persistFlag === "0") {
    rcs.push("RC-2", "RC-3");
  }
  return [...new Set(rcs)];
}

/**
 * @param {ReturnType<typeof gatherHubWalletDebugSnapshot>} snapshot
 */
export function formatHubWalletDebugHubLine(snapshot) {
  const count =
    typeof snapshot.walletCount === "number" ? String(snapshot.walletCount) : "—";
  const parts = [`Wallet debug: ${count} saved`, `parse ${snapshot.walletParse}`];
  if (snapshot.persistFlag === "0") parts.push("persist denied");
  if (snapshot.standalone) parts.push("standalone");
  return parts.join(" · ");
}

/**
 * @param {ReturnType<typeof gatherHubWalletDebugSnapshot>} snapshot
 */
export function formatHubWalletDebugCopyBlock(snapshot) {
  const rcs = suggestHubDisappearanceRcs(snapshot);
  const lines = [
    "--- wallet custody debug ---",
    `walletParse=${snapshot.walletParse}`,
    `walletBytes=${snapshot.walletBytes}`,
    `walletCount=${snapshot.walletCount ?? "null"}`,
    `summaryBytes=${snapshot.summaryBytes}`,
    `sessionHasKey=${snapshot.sessionHasKey}`,
    `persistFlag=${snapshot.persistFlag ?? ""}`,
    `standalone=${snapshot.standalone}`,
    `origin=${snapshot.origin}`,
  ];
  if (rcs.length) lines.push(`likelyRc=${rcs.join(",")}`);
  lines.push(`snapshot=${JSON.stringify(snapshot)}`);
  return lines.join("\n");
}
