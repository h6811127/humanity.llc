import { findScanCapability } from "./scan-capabilities";
import type { ScanViewModel } from "../resolver/scan-state";

/**
 * Succession / governance phase for public scan truth (Order 6).
 * Dispute and inherit verbs remain research — archive + sunset only today.
 */
export type SuccessionPhase = "live" | "sunset" | "archived";

export type SuccessionScanContext = {
  phase: SuccessionPhase;
  scanNote: string | null;
};

function successionNoteForArchiveState(state: string): string | null {
  switch (state) {
    case "season_ended":
      return "Season ended — public state is read-only until a new act opens.";
    case "season_not_open":
      return "Season not open yet — object readable, game actions asleep.";
    case "dormant":
      return "Object dormant — readable public state only.";
    case "after":
      return "Published window ended — last signed state only.";
    case "outside_schedule":
      return "Outside published hours — schedule may resume later.";
    case "care_pause":
      return "Maintenance pause — care stream overrides game copy.";
    case "grace":
      return "Recall grace — steward may update before archive.";
    default:
      return null;
  }
}

/** Derive succession hints for status JSON from scan view model. */
export function resolveSuccessionScanContext(
  vm: ScanViewModel
): SuccessionScanContext {
  if (vm.kind === "card_revoked" || vm.kind === "qr_revoked") {
    return {
      phase: "archived",
      scanNote:
        "This object was disabled by its steward. The URL may still resolve for audit and last public state.",
    };
  }

  const archive = findScanCapability(vm.capabilities, "archive");
  if (archive?.available && archive.state) {
    const note = successionNoteForArchiveState(archive.state);
    if (
      archive.state === "grace" ||
      archive.state === "care_pause"
    ) {
      return { phase: "live", scanNote: note };
    }
    if (note) {
      return { phase: "sunset", scanNote: note };
    }
  }

  if (vm.childTimePolicy?.phase === "after") {
    return {
      phase: "sunset",
      scanNote: vm.childTimePolicy.scanNote,
    };
  }

  if (vm.childTimePolicy?.phase === "grace") {
    return {
      phase: "live",
      scanNote: vm.childTimePolicy.scanNote,
    };
  }

  return { phase: "live", scanNote: null };
}
