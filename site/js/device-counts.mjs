import { getLiveControlPendingCount, getLiveControlPollHealth } from "./device-live-control-inbox.mjs";
import {
  buildDeviceCountsLabel,
  buildStatusSegmentsFromCounts,
  tabNoticeCountFromState,
} from "./device-counts-core.mjs";
import { isWalletSaved, loadWalletSummary } from "./device-wallet.mjs";
import { loadPins } from "./device-pins.mjs";

export function tabNoticeCount() {
  try {
    const raw = sessionStorage.getItem("hc_created");
    const session = raw ? JSON.parse(raw) : null;
    if (!session?.profile_id) return 0;
    return tabNoticeCountFromState(session, isWalletSaved(session.profile_id));
  } catch {
    return 0;
  }
}

function pollableSavedCount() {
  return loadWalletSummary().pollableCount;
}

/**
 * @param {"ok"|"degraded"|"offline"} network
 */
export function buildStatusSegments(network = "offline") {
  return buildStatusSegmentsFromCounts({
    network,
    saved: loadWalletSummary().count,
    pins: loadPins().length,
    notices: tabNoticeCount(),
    liveProof: getLiveControlPendingCount(),
    pollableSaved: pollableSavedCount(),
    liveProofPollHealth: getLiveControlPollHealth(),
  });
}

/** @param {"ok"|"degraded"|"offline"} network */
export function buildStatusLine(network = "offline") {
  const segments = buildStatusSegments(network);
  return {
    saved: loadWalletSummary().count,
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
  return buildDeviceCountsLabel(loadWalletSummary().count, loadPins().length);
}
