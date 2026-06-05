import { describe, expect, it } from "vitest";

import {
  CREATE_HANDOFF_BANNER_TITLE,
  createHandoffDetailLine,
  redirectOpenStatusForDeploy,
} from "../../site/js/create-handoff-core.mjs";
import {
  freshSetupHeroCopy,
  resolveCreatedFreshPresentation,
  resolveFreshOutcomeKind,
} from "../../site/js/created-fresh-presentation-core.mjs";
import { WEAR_PRINT_FOCUS } from "../../site/js/create-wear-wizard-core.mjs";
import { GAME_SEASON_SETUP_FOCUS } from "../../site/js/create-organizer-season-core.mjs";
import { deploySubmitButtonLabel } from "../../site/js/create-deploy-wizard-core.mjs";
import { wearSubmitButtonLabel } from "../../site/js/create-wear-wizard-core.mjs";
import { gameSeasonSubmitButtonLabel } from "../../site/js/create-season-fork-ui-core.mjs";

describe("resolveFreshOutcomeKind", () => {
  it("detects wear, season, sign, and account paths", () => {
    expect(
      resolveFreshOutcomeKind({
        searchParams: new URLSearchParams(`focus=${WEAR_PRINT_FOCUS}`),
      })
    ).toBe("wear");
    expect(
      resolveFreshOutcomeKind({
        searchParams: new URLSearchParams(`room=season&focus=${GAME_SEASON_SETUP_FOCUS}`),
      })
    ).toBe("season");
    expect(
      resolveFreshOutcomeKind({
        searchParams: new URLSearchParams(""),
        hash: "#add-status-plate",
      })
    ).toBe("sign");
    expect(
      resolveFreshOutcomeKind({
        searchParams: new URLSearchParams(""),
      })
    ).toBe("account");
  });
});

describe("freshSetupHeroCopy", () => {
  it("uses path-aware titles and leads", () => {
    expect(freshSetupHeroCopy("sign", "setup").title).toBe("Your sign is ready.");
    expect(freshSetupHeroCopy("wear", "setup").title).toBe("Your wearable QR is ready.");
    expect(freshSetupHeroCopy("season", "setup").title).toBe("Set up your season");
    expect(freshSetupHeroCopy("account", "setup").title).toBe("Your account is ready.");
  });
});

describe("resolveCreatedFreshPresentation", () => {
  it("returns handoff banner for redirect paths", () => {
    const presentation = resolveCreatedFreshPresentation({
      freshParam: false,
      mode: "control",
      searchParams: new URLSearchParams("focus=game-season-setup&room=season"),
      handoff: { kind: "season", handle: "@river_studio", at: 1 },
    });
    expect(presentation.handoffBanner?.title).toBe(CREATE_HANDOFF_BANNER_TITLE);
    expect(presentation.handoffBanner?.detail).toContain("@river_studio");
  });
});

describe("redirect labels (P2.5)", () => {
  const root = { handle: "river_studio", profile_id: "prof1" };

  it("uses @handle task language for deploy redirect", () => {
    expect(deploySubmitButtonLabel("status_plate", "redirect_live", root)).toBe(
      "Open @river_studio to add sign"
    );
  });

  it("uses @handle task language for wear and season redirect", () => {
    expect(wearSubmitButtonLabel("redirect_live", root)).toBe(
      "Open @river_studio to add wearable QR"
    );
    expect(gameSeasonSubmitButtonLabel("use_existing_account", root)).toBe(
      "Open @river_studio to set up season"
    );
  });

  it("uses redirect status strings on submit", () => {
    expect(redirectOpenStatusForDeploy("status_plate", root)).toBe(
      "Opening @river_studio to add your sign…"
    );
    expect(createHandoffDetailLine("deploy_sign", "@river_studio")).toContain(
      "add your sign there"
    );
  });
});
