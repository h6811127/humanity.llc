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
  } else if (pollableSaved > 0 && liveProofPollHealth === "degraded") {
    segments.push({
      id: "liveproof",
      label: "Proof Check Limited",
      detail: "Could not reach the resolver for some saved cards",
      zero: false,
      highlight: true,
    });
  } else if (pollableSaved > 0 && liveProofPollHealth === "offline") {
    segments.push({
      id: "liveproof",
      label: "Proof Check Offline",
      detail: "Live proof inbox unavailable while resolver is unreachable",
      zero: false,
      highlight: true,
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
