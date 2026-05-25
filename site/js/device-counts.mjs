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
      ? "Resolver Online"
      : network === "degraded"
        ? "Resolver Limited"
        : "Resolver Offline";

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
      label: saved === 0 ? "No Cards on Device" : `${saved} on Device`,
      detail:
        saved === 0
          ? "No signing keys saved on this device"
          : `${saved} card${saved === 1 ? "" : "s"} stored on this device`,
      zero: saved === 0,
      highlight: false,
    },
    {
      id: "pinned",
      label: pins === 0 ? "No Pinned Scans" : `${pins} Pinned`,
      detail: `${pins} pinned scan${pins === 1 ? "" : "s"} on this device`,
      zero: pins === 0,
      highlight: false,
    },
    {
      id: "notices",
      label: notices > 0 ? "Tab Keys Active" : "Local Keys Ready",
      detail:
        notices > 0
          ? "Signing keys in this tab  -  not saved on device"
          : "This device can open saved cards",
      zero: notices === 0,
      highlight: notices > 0,
    },
  ];

  if (liveProof > 0) {
    segments.push({
      id: "liveproof",
      label: `${liveProof} Live Proof Waiting`,
      detail: `${liveProof} live proof request${liveProof === 1 ? "" : "s"} awaiting signature`,
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
  if (saved > 0) parts.push(`${saved} on Device`);
  if (pins > 0) parts.push(`${pins} Pinned`);
  return {
    saved,
    pins,
    total: saved + pins,
    label: parts.join(" · ") || "",
  };
}
