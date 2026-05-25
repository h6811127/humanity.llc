import { loadWallet, isWalletSaved } from "./device-wallet.mjs";
import { loadPins } from "./device-pins.mjs";

function tabNoticeCount() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    const session = raw ? JSON.parse(raw) : null;
    if (!session?.profile_id || !session?.owner_private_key_b58) return 0;
    return isWalletSaved(session.profile_id) ? 0 : 1;
  } catch {
    return 0;
  }
}

/**
 * @param {"ok"|"degraded"|"offline"} network
 * @returns {{ saved: number, pins: number, notices: number, parts: string[], line: string }}
 */
export function buildStatusLine(network = "offline") {
  const saved = loadWallet().length;
  const pins = loadPins().length;
  const notices = tabNoticeCount();

  const networkPart =
    network === "ok"
      ? "Network live"
      : network === "degraded"
        ? "Network limited"
        : "Network offline";

  const parts = [
    networkPart,
    `${saved} saved`,
    `${pins} pinned`,
    `${notices} notice${notices === 1 ? "" : "s"}`,
  ];

  return { saved, pins, notices, parts, line: parts.join(" · ") };
}

/**
 * @returns {{ saved: number, pins: number, total: number, label: string }}
 */
export function getDeviceCounts() {
  const saved = loadWallet().length;
  const pins = loadPins().length;
  const parts = [];
  if (saved > 0) parts.push(`${saved} saved`);
  if (pins > 0) parts.push(`${pins} pinned`);
  return {
    saved,
    pins,
    total: saved + pins,
    label: parts.join(" · ") || "",
  };
}
