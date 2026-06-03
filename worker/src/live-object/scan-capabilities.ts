import type { GameNodeScanContext } from "../city-game/scan-view";
import { isGameNodeExpired } from "../city-game/scan-view";
import {
  CHILD_OBJECT_TYPE_LOST_ITEM_RELAY,
  isPhaseAChildObjectType,
} from "./object-types";
import type { ScanHeroTemplate } from "../resolver/manifesto-display";
import { resolveScanHeroDisplay } from "../resolver/manifesto-display";
import type { ScanPageKind } from "../resolver/scan-state";
import type { ScanViewModel } from "../resolver/scan-state";
import type { GameContributeMode } from "../city-game/unlock-engine";
import { isCareStreamPaused } from "./stream-policy";

export type ScanCapabilityVerb =
  | "read"
  | "request"
  | "offer"
  | "contribute"
  | "archive";

/** Scan HTML trust detail groups (Layer 2 layout — carried on `read`). */
export type ScanTrustGroupKind = "card" | "human" | "qr";

export type ScanCapability = {
  verb: ScanCapabilityVerb;
  available: boolean;
  kind?: string;
  reason?: string;
  state?: string;
  /** Trust stack rows below the hero — only on the `read` capability. */
  trust_groups?: ScanTrustGroupKind[];
};

export function findScanCapability(
  caps: ScanCapability[],
  verb: ScanCapabilityVerb
): ScanCapability | undefined {
  return caps.find((cap) => cap.verb === verb);
}

export function isScanCapabilityAvailable(
  caps: ScanCapability[],
  verb: ScanCapabilityVerb
): boolean {
  return findScanCapability(caps, verb)?.available ?? false;
}

/** Layer 2 — scan HTML live-control trust group + client script gate. */
export function shouldShowLiveControlTrustGroup(
  caps: ScanCapability[] | null | undefined
): boolean {
  return findScanCapability(caps ?? [], "request") != null;
}

export function readTrustGroups(
  caps: ScanCapability[] | null | undefined
): ScanTrustGroupKind[] {
  return findScanCapability(caps ?? [], "read")?.trust_groups ?? [];
}

export function shouldShowTrustGroup(
  caps: ScanCapability[] | null | undefined,
  group: ScanTrustGroupKind
): boolean {
  return readTrustGroups(caps).includes(group);
}

export function shouldShowCardTrustGroup(
  caps: ScanCapability[] | null | undefined
): boolean {
  return shouldShowTrustGroup(caps, "card");
}

export function shouldShowHumanTrustGroup(
  caps: ScanCapability[] | null | undefined
): boolean {
  return shouldShowTrustGroup(caps, "human");
}

export function shouldShowQrTrustGroup(
  caps: ScanCapability[] | null | undefined
): boolean {
  return shouldShowTrustGroup(caps, "qr");
}

export function readHeroTemplate(caps: ScanCapability[]): ScanHeroTemplate | null {
  const kind = findScanCapability(caps, "read")?.kind;
  if (
    kind === "status_plate" ||
    kind === "lost_item_relay" ||
    kind === "live_object" ||
    kind === "personal_card"
  ) {
    return kind;
  }
  return null;
}

export function gameContributeModeFromCapability(
  cap: ScanCapability | undefined
): GameContributeMode | null {
  if (!cap?.kind?.startsWith("game_")) return null;
  const mode = cap.kind.slice("game_".length);
  if (mode === "quorum" || mode === "fragment" || mode === "scarcity") {
    return mode;
  }
  return null;
}

function resolveTrustGroups(vm: ScanViewModel): ScanTrustGroupKind[] {
  const groups: ScanTrustGroupKind[] = [];
  if (vm.showCardBlock) groups.push("card");
  if (vm.showHumanTrustBlock) groups.push("human");
  if (vm.showArtifactBlock) groups.push("qr");
  return groups;
}

function readCapability(vm: ScanViewModel): ScanCapability {
  const available = vm.kind === "active";
  const { template } = resolveScanHeroDisplay({
    manifestoLine: vm.manifestoLine,
    qrScope: vm.qrScope,
    childObjectType: vm.childObjectType,
    childPublicLabel: vm.childPublicLabel,
    childPublicState: vm.childPublicState,
  });
  const trust_groups = resolveTrustGroups(vm);
  return {
    verb: "read",
    available,
    kind: template,
    ...(trust_groups.length ? { trust_groups } : {}),
    ...(available ? {} : { reason: vm.kind }),
  };
}

function liveProofCapability(vm: ScanViewModel): ScanCapability | null {
  // Live proof is for root card QRs only — not child-object or print-artifact scans.
  if (vm.qrScope === "child_object" || vm.qrScope === "print_artifact") {
    return null;
  }
  if (!vm.showLiveControlBlock) {
    return null;
  }
  return {
    verb: "request",
    kind: "live_proof",
    available: vm.kind === "active" && vm.liveControlAvailable,
    ...(!vm.liveControlAvailable && vm.kind === "active"
      ? { reason: "not_offered" }
      : vm.kind !== "active"
        ? { reason: vm.kind }
        : {}),
  };
}

function offerCapability(vm: ScanViewModel): ScanCapability | null {
  const { template } = resolveScanHeroDisplay({
    manifestoLine: vm.manifestoLine,
    qrScope: vm.qrScope,
    childObjectType: vm.childObjectType,
    childPublicLabel: vm.childPublicLabel,
    childPublicState: vm.childPublicState,
  });
  const isLostItem =
    template === "lost_item_relay" ||
    vm.childObjectType === CHILD_OBJECT_TYPE_LOST_ITEM_RELAY;
  if (!isLostItem) return null;
  return {
    verb: "offer",
    kind: "finder_relay",
    available: vm.kind === "active",
    ...(vm.kind !== "active" ? { reason: vm.kind } : {}),
  };
}

function contributeReason(game: GameNodeScanContext, now: Date): string {
  if (!game.enabled) return "game_disabled";
  if (game.mode === "care_pause") return "care_maintenance";
  if (game.seasonWindowPhase === "before") return "season_not_open";
  if (game.seasonWindowPhase === "after") return "season_ended";
  if (isGameNodeExpired(game.gameMeta, now)) return "object_expired";
  if (game.mode === "dormant") return "object_dormant";
  if (!game.showsContribute) return "no_contribute_surface";
  return "unavailable";
}

function contributeCapability(
  game: GameNodeScanContext,
  scanKind: ScanPageKind,
  now: Date
): ScanCapability {
  const available =
    scanKind === "active" &&
    game.enabled &&
    game.mode === "game" &&
    game.showsContribute &&
    game.contributeMode != null;

  const cap: ScanCapability = {
    verb: "contribute",
    available,
  };

  if (game.contributeMode) {
    cap.kind = `game_${game.contributeMode}`;
  }

  if (!available) {
    cap.reason = scanKind !== "active" ? scanKind : contributeReason(game, now);
  }

  return cap;
}

function archiveCapability(game: GameNodeScanContext): ScanCapability {
  if (game.mode === "game") {
    return { verb: "archive", available: false, state: "live" };
  }
  if (game.mode === "care_pause") {
    return { verb: "archive", available: true, state: "care_pause" };
  }
  if (game.seasonWindowPhase === "after") {
    return { verb: "archive", available: true, state: "season_ended" };
  }
  if (game.seasonWindowPhase === "before") {
    return { verb: "archive", available: true, state: "season_not_open" };
  }
  if (game.mode === "dormant") {
    return { verb: "archive", available: true, state: "dormant" };
  }
  return { verb: "archive", available: false, state: "fallback" };
}

function phaseAChildArchiveCapability(vm: ScanViewModel): ScanCapability | null {
  if (!isPhaseAChildObjectType(vm.childObjectType)) return null;
  const phase = vm.childTimePolicy?.phase ?? "unset";
  if (phase === "unset" || phase === "active") {
    return { verb: "archive", available: false, state: "live" };
  }
  if (phase === "grace") {
    return { verb: "archive", available: true, state: "grace" };
  }
  return { verb: "archive", available: true, state: phase };
}

function cardStreamArchiveCapability(vm: ScanViewModel): ScanCapability | null {
  if (vm.qrScope !== "card" || !vm.objectStreams.length) return null;
  if (!isCareStreamPaused(vm.objectStreams)) return null;
  return { verb: "archive", available: true, state: "care_pause" };
}

/** Derive scan.capabilities[] from existing view-model flags (Layer 2 / Order 3). */
export function buildScanCapabilities(
  vm: ScanViewModel,
  now: Date = new Date()
): ScanCapability[] {
  const caps: ScanCapability[] = [readCapability(vm)];

  const liveProof = liveProofCapability(vm);
  if (liveProof) caps.push(liveProof);

  const offer = offerCapability(vm);
  if (offer) caps.push(offer);

  if (vm.gameNode?.enabled && vm.gameNode.mode !== "fallback") {
    caps.push(contributeCapability(vm.gameNode, vm.kind, now));
    caps.push(archiveCapability(vm.gameNode));
  } else {
    const phaseArchive = phaseAChildArchiveCapability(vm);
    if (phaseArchive) {
      caps.push(phaseArchive);
    } else {
      const cardArchive = cardStreamArchiveCapability(vm);
      if (cardArchive) caps.push(cardArchive);
    }
  }

  return caps;
}

/** True when Phase A child object scans advertise owner-update path (read only). */
export function isPhaseAChildObjectRead(
  vm: ScanViewModel,
  caps: ScanCapability[] = vm.capabilities ?? buildScanCapabilities(vm)
): boolean {
  return (
    vm.qrScope === "child_object" &&
    isPhaseAChildObjectType(vm.childObjectType) &&
    isScanCapabilityAvailable(caps, "read")
  );
}
