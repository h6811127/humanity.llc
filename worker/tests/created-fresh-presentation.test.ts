import { describe, expect, it } from "vitest";

import {
  CREATE_HANDOFF_BANNER_TITLE,
  createHandoffDetailLine,
  redirectOpenStatusForDeploy,
} from "../../site/js/create-handoff-core.mjs";
import {
  CONTROL_ACCOUNT_HERO_LEAD,
  CONTROL_SEASON_HERO_LEAD,
  CONTROL_SIGN_HERO_LEAD,
  CONTROL_TAG_HERO_LEAD,
  CONTROL_WEAR_HERO_LEAD,
  controlHeroCopy,
  controlHeroTitle,
  freshSetupHeroCopy,
  resolveControlOutcomeKind,
  resolveCreatedFreshPresentation,
  resolveFreshOutcomeKind,
  seasonContinuationHeroCopy,
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
        hash: "#add-lost-item",
      })
    ).toBe("tag");
    expect(
      resolveFreshOutcomeKind({
        searchParams: new URLSearchParams("deploy_success=1&endpoint=lost_item_relay"),
      })
    ).toBe("tag");
    expect(
      resolveFreshOutcomeKind({
        searchParams: new URLSearchParams(""),
      })
    ).toBe("account");
  });
});

describe("controlHeroTitle", () => {
  it("uses contextual live titles and next-step leads (P1.1)", () => {
    expect(controlHeroTitle("sign")).toBe("Your sign is live");
    expect(controlHeroTitle("tag")).toBe("Your tag is live");
    expect(controlHeroTitle("wear")).toBe("Your wearable QR is live");
    expect(controlHeroTitle("season")).toBe("Your season is live");
    expect(controlHeroTitle("account")).toBe("Your account is live");
    expect(controlHeroCopy("account").lead).toBe(CONTROL_ACCOUNT_HERO_LEAD);
    expect(controlHeroCopy("sign").lead).toBe(CONTROL_SIGN_HERO_LEAD);
    expect(controlHeroCopy("tag").lead).toBe(CONTROL_TAG_HERO_LEAD);
    expect(controlHeroCopy("wear").lead).toBe(CONTROL_WEAR_HERO_LEAD);
    expect(controlHeroCopy("season").lead).toBe(CONTROL_SEASON_HERO_LEAD);
  });

  it("maps lost-item pilot sessions to tag hero", () => {
    expect(
      resolveControlOutcomeKind({
        searchParams: new URLSearchParams(""),
        session: { pilot_template: "lost_item_relay" },
      })
    ).toBe("tag");
    expect(
      resolveControlOutcomeKind({
        searchParams: new URLSearchParams(""),
        session: { pilot_template: "status_plate" },
      })
    ).toBe("sign");
  });
});

describe("freshSetupHeroCopy", () => {
  it("uses path-aware titles and leads", () => {
    expect(freshSetupHeroCopy("sign", "setup").title).toBe("Your sign is ready.");
    expect(freshSetupHeroCopy("tag", "setup").title).toBe("Your tag is ready.");
    expect(freshSetupHeroCopy("wear", "setup").title).toBe("Your wearable QR is ready.");
    expect(freshSetupHeroCopy("season", "setup").title).toBe("Set up your season");
    expect(freshSetupHeroCopy("account", "setup").title).toBe("Your account is ready.");
  });
});

describe("resolveCreatedFreshPresentation", () => {
  it("uses control hero copy on first control visit", () => {
    const presentation = resolveCreatedFreshPresentation({
      freshParam: false,
      mode: "control",
      searchParams: new URLSearchParams(""),
      session: { pilot_template: "status_plate" },
    });
    expect(presentation.hero?.title).toBe("Your sign is live");
    expect(presentation.hero?.lead).toBe(CONTROL_SIGN_HERO_LEAD);
  });

  it("includes account hero lead for general control", () => {
    const presentation = resolveCreatedFreshPresentation({
      freshParam: false,
      mode: "control",
      searchParams: new URLSearchParams(""),
      session: { pilot_template: "general" },
    });
    expect(presentation.hero?.title).toBe("Your account is live");
    expect(presentation.hero?.lead).toBe(CONTROL_ACCOUNT_HERO_LEAD);
  });

  it("includes tag hero lead for lost-item relay control", () => {
    const presentation = resolveCreatedFreshPresentation({
      freshParam: false,
      mode: "control",
      searchParams: new URLSearchParams(""),
      session: { pilot_template: "lost_item_relay" },
    });
    expect(presentation.hero?.title).toBe("Your tag is live");
    expect(presentation.hero?.lead).toBe(CONTROL_TAG_HERO_LEAD);
  });

  it("includes wear hero lead when focus is wear print", () => {
    const presentation = resolveCreatedFreshPresentation({
      freshParam: false,
      mode: "control",
      searchParams: new URLSearchParams(`focus=${WEAR_PRINT_FOCUS}`),
      session: { pilot_template: "general" },
    });
    expect(presentation.hero?.title).toBe("Your wearable QR is live");
    expect(presentation.hero?.lead).toBe(CONTROL_WEAR_HERO_LEAD);
  });

  it("includes season hero lead on season control path", () => {
    const presentation = resolveCreatedFreshPresentation({
      freshParam: false,
      mode: "control",
      searchParams: new URLSearchParams(`room=season&focus=${GAME_SEASON_SETUP_FOCUS}`),
      session: { pilot_template: "general" },
    });
    expect(presentation.hero?.title).toBe("Your season is live");
    expect(presentation.hero?.lead).toBe(CONTROL_SEASON_HERO_LEAD);
  });

  it("uses season continuation lead with handoff banner", () => {
    const presentation = resolveCreatedFreshPresentation({
      freshParam: false,
      mode: "control",
      searchParams: new URLSearchParams("focus=game-season-setup&room=season"),
      handoff: { kind: "season", handle: "@river_studio", at: 1 },
    });
    expect(presentation.hero?.title).toBe("Continue season setup");
    expect(presentation.hero?.lead).toBe(CONTROL_SEASON_HERO_LEAD);
    expect(seasonContinuationHeroCopy("season")?.lead).toBe(CONTROL_SEASON_HERO_LEAD);
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
