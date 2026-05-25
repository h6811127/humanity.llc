import { getLiveControlPendingCount } from "./device-live-control-inbox.mjs";
import { loadWallet, isWalletSaved } from "./device-wallet.mjs";
import { loadPins } from "./device-pins.mjs";

export function tabNoticeCount() {
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
 */
export function buildStatusSegments(network = "offline") {
  const saved = loadWallet().length;
  const pins = loadPins().length;
  const notices = tabNoticeCount();
  const liveProof = getLiveControlPendingCount();

  const networkLabel =
    network === "ok"
      ? "Network live"
      : network === "degraded"
        ? "Network limited"
        : "Network offline";

  const segments = [
    {
      id: "network",
      label: networkLabel,
      detail: networkLabel,
      zero: false,
      highlight: false,
    },
    {
      id: "saved",
      label: `${saved} saved`,
      detail: `${saved} saved card${saved === 1 ? "" : "s"} on this device`,
      zero: saved === 0,
      highlight: false,
    },
    {
      id: "pinned",
      label: `${pins} pinned`,
      detail: `${pins} pinned scan${pins === 1 ? "" : "s"}`,
      zero: pins === 0,
      highlight: false,
    },
    {
      id: "notices",
      label: `${notices} notice${notices === 1 ? "" : "s"}`,
      detail:
        notices > 0
          ? "Keys in this tab — not saved on device"
          : "No pending notices",
      zero: notices === 0,
      highlight: notices > 0,
    },
  ];

  if (liveProof > 0) {
    segments.push({
      id: "liveproof",
      label: `${liveProof} proof waiting`,
      detail: `${liveProof} live proof request${liveProof === 1 ? "" : "s"} on saved cards`,
      zero: false,
      highlight: true,
    });
  }

  return segments;
}

/** @param {"ok"|"degraded"|"offline"} network */
export function buildStatusLine(network = "offline") {
  const segments = buildStatusSegments(network);
  return {
    saved: loadWallet().length,
    pins: loadPins().length,
    notices: tabNoticeCount(),
    segments,
    line: segments.map((s) => s.label).join(" · "),
  };
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
