import { describe, expect, it } from "vitest";

import {
  scanLiveProofOwnerPollShouldRun,
  scanLiveProofOwnerWalletEntryForScan,
  SCAN_LIVE_PROOF_OWNER_POLL_MS,
} from "../../site/js/scan-live-proof-owner-watch-core.mjs";

const readQr = (entry: Record<string, unknown>) =>
  typeof entry.qr_id === "string" ? entry.qr_id : null;

describe("SCAN_LIVE_PROOF_OWNER_POLL_MS", () => {
  it("matches /created/ view-mode cadence", () => {
    expect(SCAN_LIVE_PROOF_OWNER_POLL_MS).toBe(3000);
  });
});

describe("scanLiveProofOwnerWalletEntryForScan", () => {
  it("returns entry when profile and qr_id match scan URL", () => {
    const entry = { profile_id: "pid1", qr_id: "qr1" };
    expect(
      scanLiveProofOwnerWalletEntryForScan("pid1", "qr1", entry, readQr)
    ).toBe(entry);
  });

  it("returns null when qr_id differs", () => {
    expect(
      scanLiveProofOwnerWalletEntryForScan(
        "pid1",
        "qr1",
        { profile_id: "pid1", qr_id: "qr2" },
        readQr
      )
    ).toBe(null);
  });

  it("returns null when profile differs", () => {
    expect(
      scanLiveProofOwnerWalletEntryForScan(
        "pid1",
        "qr1",
        { profile_id: "pid2", qr_id: "qr1" },
        readQr
      )
    ).toBe(null);
  });
});

describe("scanLiveProofOwnerPollShouldRun", () => {
  const base = {
    documentVisible: true,
    operatorFamiliar: true,
    profileId: "pid1",
    scanQrId: "qr1",
    walletEntry: { profile_id: "pid1", qr_id: "qr1" },
    resolverHealth: "ok" as const,
  };

  it("runs when scope is satisfied", () => {
    expect(scanLiveProofOwnerPollShouldRun(base)).toBe(true);
  });

  it("does not run when tab is hidden", () => {
    expect(
      scanLiveProofOwnerPollShouldRun({ ...base, documentVisible: false })
    ).toBe(false);
  });

  it("does not run for strangers (not operator-familiar)", () => {
    expect(
      scanLiveProofOwnerPollShouldRun({ ...base, operatorFamiliar: false })
    ).toBe(false);
  });

  it("does not run without a matching wallet row", () => {
    expect(
      scanLiveProofOwnerPollShouldRun({ ...base, walletEntry: null })
    ).toBe(false);
  });

  it("does not run when resolver health is degraded or offline", () => {
    expect(
      scanLiveProofOwnerPollShouldRun({ ...base, resolverHealth: "degraded" })
    ).toBe(false);
    expect(
      scanLiveProofOwnerPollShouldRun({ ...base, resolverHealth: "offline" })
    ).toBe(false);
  });
});
