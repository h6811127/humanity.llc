import type { GameNodeScanContext } from "../city-game/scan-view";
import { isGameNodeExpired } from "../city-game/scan-view";
import type { ScanPageKind } from "../resolver/scan-state";
import type { ScanViewModel } from "../resolver/scan-state";

export type ScanCapabilityVerb =
  | "read"
  | "request"
  | "contribute"
  | "archive";

export type ScanCapability = {
  verb: ScanCapabilityVerb;
  available: boolean;
  kind?: string;
  reason?: string;
  state?: string;
};

function readCapability(kind: ScanPageKind): ScanCapability {
  const available = kind === "active";
  return {
    verb: "read",
    available,
    ...(available ? {} : { reason: kind }),
  };
}

function liveProofCapability(vm: ScanViewModel): ScanCapability | null {
  if (vm.qrScope === "child_object" && vm.childObjectType === "game_node") {
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

/** Derive scan.capabilities[] from existing view-model flags (Layer 2 / Order 2–3 bridge). */
export function buildScanCapabilities(
  vm: ScanViewModel,
  now: Date = new Date()
): ScanCapability[] {
  const caps: ScanCapability[] = [readCapability(vm.kind)];

  const liveProof = liveProofCapability(vm);
  if (liveProof) caps.push(liveProof);

  if (vm.gameNode?.enabled && vm.gameNode.mode !== "fallback") {
    caps.push(contributeCapability(vm.gameNode, vm.kind, now));
    caps.push(archiveCapability(vm.gameNode));
  }

  return caps;
}
