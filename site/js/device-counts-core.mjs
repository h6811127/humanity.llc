/**
 * @param {{ profile_id?: string, owner_private_key_b58?: string } | null | undefined} session
 * @param {boolean} isSavedOnDevice
 */
export function tabNoticeCountFromState(session, isSavedOnDevice) {
  if (!session?.profile_id || !session?.owner_private_key_b58) return 0;
  return isSavedOnDevice ? 0 : 1;
}

/**
 * @param {{
 *   network: "ok" | "degraded" | "offline",
 *   saved: number,
 *   pins: number,
 *   notices: number,
 *   liveProof: number,
 *   pollableSaved?: number,
 *   liveProofPollHealth?: "ok" | "degraded" | "offline",
 * }} input
 */
export function buildStatusSegmentsFromCounts(input) {
  const {
    network,
    saved,
    pins,
    notices,
    liveProof,
    pollableSaved = 0,
    liveProofPollHealth = "ok",
  } = input;

  const networkLabel =
    network === "ok"
      ? "Resolver Online"
      : network === "degraded"
        ? "Resolver Limited"
        : "Resolver Offline";
  const networkChip =
    network === "ok"
      ? "Network reachable"
      : network === "degraded"
        ? "Sync limited"
        : "Offline";

  /** @type {Array<{ id: string, label: string, chipLabel: string, detail: string, zero: boolean, highlight: boolean, chipTone?: string }>} */
  const segments = [
    {
      id: "network",
      label: networkLabel,
      chipLabel: networkChip,
      detail: networkLabel,
      zero: false,
      highlight: false,
      chipTone: `network-${network}`,
    },
    {
      id: "saved",
      label: saved === 0 ? "No Cards on Device" : `${saved} on Device`,
      chipLabel: saved === 0 ? "0 cards" : `${saved} card${saved === 1 ? "" : "s"}`,
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
      chipLabel: pins === 0 ? "0 pinned" : `${pins} pinned`,
      detail: `${pins} pinned scan${pins === 1 ? "" : "s"} on this device`,
      zero: pins === 0,
      highlight: false,
    },
  ];

  if (notices > 0) {
    segments.push({
      id: "notices",
      label: "Tab Keys Active",
      chipLabel: "Tab keys",
      detail: "Signing keys in this tab  -  not saved on device",
      zero: false,
      highlight: true,
      chipTone: "highlight",
    });
  }

  if (liveProof > 0) {
    segments.push({
      id: "liveproof",
      label: `${liveProof} Live Proof Waiting`,
      chipLabel: `${liveProof} proof`,
      detail: `${liveProof} live proof request${liveProof === 1 ? "" : "s"} awaiting signature`,
      zero: false,
      highlight: true,
      chipTone: "highlight",
    });
  } else if (pollableSaved > 0 && liveProofPollHealth === "degraded") {
    segments.push({
      id: "liveproof",
      label: "Proof Check Limited",
      chipLabel: "Proof limited",
      detail: "Could not reach the resolver for some saved cards",
      zero: false,
      highlight: true,
      chipTone: "highlight",
    });
  } else if (pollableSaved > 0 && liveProofPollHealth === "offline") {
    segments.push({
      id: "liveproof",
      label: "Proof Check Offline",
      chipLabel: "Proof offline",
      detail: "Live proof inbox unavailable while resolver is unreachable",
      zero: false,
      highlight: true,
      chipTone: "highlight",
    });
  }

  return segments;
}

/**
 * @param {number} saved
 * @param {number} pins
 */
export function buildDeviceCountsLabel(saved, pins) {
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
