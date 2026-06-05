import { describe, expect, it } from "vitest";

import {
  countGeneralRootWalletEntries,
  hasExplicitGameSeasonContext,
  hubAccountLineIdentity,
  hubAccountLineTitle,
  hubRootPresentationMode,
  hubRootRowTitle,
  shouldExpandHostedGameSeasonPanel,
  shouldUseObjectFirstHubGroup,
} from "../../site/js/hub-objects-presentation-core.mjs";

describe("shouldUseObjectFirstHubGroup", () => {
  it("enables object-first when general root has children", () => {
    expect(
      shouldUseObjectFirstHubGroup({ pilot_template: "general", profile_id: "p1" }, 2)
    ).toBe(true);
  });

  it("keeps card mode for roots without children", () => {
    expect(
      shouldUseObjectFirstHubGroup({ pilot_template: "general", profile_id: "p1" }, 0)
    ).toBe(false);
  });

  it("keeps card mode for flat pilot wallet rows", () => {
    expect(
      shouldUseObjectFirstHubGroup({ pilot_template: "status_plate", profile_id: "p1" }, 1)
    ).toBe(false);
  });
});

describe("hubAccountLineTitle", () => {
  it("prefers custom label over @handle", () => {
    expect(
      hubAccountLineTitle({ label: "River studio", handle: "river_studio" })
    ).toBe("River studio");
  });

  it("uses neutral account copy when only handle exists", () => {
    expect(hubAccountLineTitle({ handle: "river_studio" })).toBe("Your account");
  });
});

describe("hubRootRowTitle", () => {
  it("de-emphasizes @handle when children exist", () => {
    expect(
      hubRootRowTitle({ handle: "river_studio", pilot_template: "general" }, 1)
    ).toBe("Your account");
  });

  it("keeps @handle title for childless general roots", () => {
    expect(
      hubRootRowTitle({ handle: "river_studio", pilot_template: "general" }, 0)
    ).toBe("@river_studio");
  });
});

describe("hubAccountLineIdentity", () => {
  it("includes account prefix and handle", () => {
    const line = hubAccountLineIdentity({
      entry: { handle: "river_studio" },
      verificationLabel: "Steward",
      verificationState: "steward",
    });
    expect(line.text).toContain("Account");
    expect(line.text).toContain("@river_studio");
    expect(line.text).toContain("Steward");
  });

  it("omits Registered from account line identity", () => {
    const line = hubAccountLineIdentity({
      entry: { handle: "river_studio" },
      verificationLabel: "Registered",
      verificationState: "registered",
    });
    expect(line.text).toBe("Account · @river_studio");
    expect(line.visible).toBe(true);
  });
});

describe("shouldExpandHostedGameSeasonPanel", () => {
  it("stays collapsed for single-root stewards without season context", () => {
    expect(
      shouldExpandHostedGameSeasonPanel({
        generalRootCount: 1,
        explicitSeasonContext: false,
        hasGameSeasonContent: true,
      })
    ).toBe(false);
  });

  it("expands for multi-root wallets", () => {
    expect(
      shouldExpandHostedGameSeasonPanel({
        generalRootCount: 2,
        hasGameSeasonContent: true,
      })
    ).toBe(true);
  });

  it("expands when URL carries explicit season focus", () => {
    expect(
      shouldExpandHostedGameSeasonPanel({
        generalRootCount: 1,
        explicitSeasonContext: true,
        hasGameSeasonContent: true,
      })
    ).toBe(true);
  });
});

describe("hasExplicitGameSeasonContext", () => {
  it("detects focus=game-season-setup", () => {
    expect(hasExplicitGameSeasonContext("focus=game-season-setup")).toBe(true);
  });

  it("detects season_id query param", () => {
    expect(hasExplicitGameSeasonContext("season_id=cr-s1")).toBe(true);
  });

  it("detects game-season-setup hash", () => {
    expect(hasExplicitGameSeasonContext("", "#game-season-setup")).toBe(true);
  });
});

describe("countGeneralRootWalletEntries", () => {
  it("counts only general roots", () => {
    expect(
      countGeneralRootWalletEntries([
        { pilot_template: "general" },
        { pilot_template: "status_plate" },
        { pilot_template: "general" },
      ])
    ).toBe(2);
  });
});

describe("hubRootPresentationMode", () => {
  it("returns account_line when object-first applies", () => {
    expect(
      hubRootPresentationMode({ pilot_template: "general", profile_id: "p1" }, 3)
    ).toBe("account_line");
  });
});
