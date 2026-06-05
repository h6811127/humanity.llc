import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  hubNetworkChipStatusForProfile,
  shouldShowHubNetworkCheckingChip,
} from "../../site/js/device-wallet-network-core.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");

describe("hub network checking chip (RC-4)", () => {
  const confirmed = (pid: string) => pid === "profile_a";

  it("shows checking on cold boot until profile is resolver-confirmed", () => {
    expect(
      shouldShowHubNetworkCheckingChip("profile_a", { fetchNetworkStatus: true }, confirmed)
    ).toBe(false);
    expect(
      shouldShowHubNetworkCheckingChip("profile_b", { fetchNetworkStatus: true }, confirmed)
    ).toBe(true);
  });

  it("forceChecking overrides per-profile confirmation", () => {
    expect(
      shouldShowHubNetworkCheckingChip(
        "profile_a",
        { fetchNetworkStatus: true, forceChecking: true },
        confirmed
      )
    ).toBe(true);
  });

  it("returns checking chip status instead of stale cache", () => {
    expect(
      hubNetworkChipStatusForProfile(
        "profile_b",
        { fetchNetworkStatus: true },
        confirmed,
        () => "active"
      )
    ).toBe("checking");
    expect(
      hubNetworkChipStatusForProfile(
        "profile_a",
        { fetchNetworkStatus: true },
        confirmed,
        () => "active"
      )
    ).toBe("active");
  });

  it("hub-ui wires Check network through checkNetworkFromHub", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "site/js/device-hub-ui.mjs"),
      "utf8"
    );
    expect(src).toContain("export async function checkNetworkFromHub()");
    expect(src).toContain("refreshResolverHealthManual");
    expect(src).toContain("onCheckNetwork: () => void checkNetworkFromHub()");
    expect(src).toContain("walletNetworkFetchAllowedByResolverHealth");
    expect(src).toContain("listWalletEntriesNeedingNetworkFetch");
  });

  it("mounts network tools inside collapsed Advanced / debug disclosure", () => {
    const src = fs.readFileSync(
      path.join(repoRoot, "site/js/device-hub-network-tools.mjs"),
      "utf8"
    );
    expect(src).toContain('document.createElement("details")');
    expect(src).toContain("HUB_NETWORK_TOOLS_ADVANCED_ID");
    expect(src).toContain("HUB_NETWORK_TOOLS_ADVANCED_SUMMARY");
    expect(src).not.toContain("Monitoring");
  });
});
