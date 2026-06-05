import { describe, expect, it } from "vitest";

import { STEWARD_ROOM_DOORS, STEWARD_ROOM_SEASON } from "../../site/js/steward-active-room-core.mjs";
import {
  inferStewardPresentationKind,
  resolveStewardPresentationKind,
  shouldOfferAddGameNodeInDefaultUi,
  shouldOfferAddLostItemRelayInDefaultUi,
  shouldOfferAddStatusPlateInDefaultUi,
  shouldShowChildObjectAddHubInDefaultUi,
  shouldShowGameNodeSetupRowInDefaultUi,
  stewardChildObjectAddHubSubcopy,
  stewardChildObjectAddHubSummaryTitle,
  STEWARD_PRESENTATION_KIND_DEPLOY,
  STEWARD_PRESENTATION_KIND_SEASON,
} from "../../site/js/steward-presentation-policy-core.mjs";

const deployRoot = { pilot_template: "general" };
const seasonRootManifesto = {
  pilot_template: "general",
  manifesto_line: "City game season spring-2026",
};
const seasonRootWithOrganizer = {
  ...seasonRootManifesto,
  issuer_public_key: "abc123organizer",
};

describe("inferStewardPresentationKind", () => {
  it("classifies deploy vs season roots", () => {
    expect(inferStewardPresentationKind(deployRoot)).toBe(STEWARD_PRESENTATION_KIND_DEPLOY);
    expect(inferStewardPresentationKind(seasonRootManifesto)).toBe(
      STEWARD_PRESENTATION_KIND_SEASON
    );
    expect(inferStewardPresentationKind(seasonRootManifesto)).toBe(
      STEWARD_PRESENTATION_KIND_SEASON
    );
    expect(inferStewardPresentationKind({ pilot_template: "status_plate" })).toBeNull();
  });

  it("merges wallet entry for season detection", () => {
    expect(
      inferStewardPresentationKind(deployRoot, {
        walletEntry: { manifesto_line: "City game season from-wallet" },
      })
    ).toBe(STEWARD_PRESENTATION_KIND_SEASON);
  });
});

describe("resolveStewardPresentationKind with active room", () => {
  it("uses switcher room over inference", () => {
    expect(
      resolveStewardPresentationKind(seasonRootManifesto, { activeRoom: STEWARD_ROOM_DOORS })
    ).toBe(STEWARD_PRESENTATION_KIND_DEPLOY);
    expect(
      resolveStewardPresentationKind(deployRoot, { activeRoom: STEWARD_ROOM_SEASON })
    ).toBe(STEWARD_PRESENTATION_KIND_SEASON);
  });
});

describe("presentation policy — deploy account", () => {
  it("offers plates and relays only", () => {
    const extras = { activeRoom: STEWARD_ROOM_DOORS };
    expect(shouldOfferAddStatusPlateInDefaultUi(deployRoot, extras)).toBe(true);
    expect(shouldOfferAddLostItemRelayInDefaultUi(deployRoot, extras)).toBe(true);
    expect(shouldOfferAddGameNodeInDefaultUi(deployRoot, extras)).toBe(false);
    expect(shouldShowGameNodeSetupRowInDefaultUi(deployRoot, extras)).toBe(false);
    expect(shouldShowChildObjectAddHubInDefaultUi(deployRoot, extras)).toBe(true);
    expect(stewardChildObjectAddHubSubcopy(deployRoot, extras)).toBe("signs · lost-item tags");
    expect(stewardChildObjectAddHubSummaryTitle(deployRoot, extras)).toBe("Add another…");
  });
});

describe("presentation policy — season account", () => {
  it("offers game nodes only", () => {
    const extras = { activeRoom: STEWARD_ROOM_SEASON };
    expect(shouldOfferAddStatusPlateInDefaultUi(seasonRootWithOrganizer, extras)).toBe(false);
    expect(shouldOfferAddLostItemRelayInDefaultUi(seasonRootWithOrganizer, extras)).toBe(false);
    expect(shouldOfferAddGameNodeInDefaultUi(seasonRootWithOrganizer, extras)).toBe(true);
    expect(shouldShowGameNodeSetupRowInDefaultUi(seasonRootWithOrganizer, extras)).toBe(false);
    expect(shouldShowChildObjectAddHubInDefaultUi(seasonRootWithOrganizer, extras)).toBe(true);
    expect(stewardChildObjectAddHubSubcopy(seasonRootWithOrganizer, extras)).toBe(
      "Season checkpoints"
    );
    expect(stewardChildObjectAddHubSummaryTitle(seasonRootWithOrganizer, extras)).toBe(
      "Add another…"
    );
  });

  it("shows setup copy when organizer key is missing on season manifesto root", () => {
    const extras = { activeRoom: STEWARD_ROOM_SEASON };
    expect(shouldShowGameNodeSetupRowInDefaultUi(seasonRootManifesto, extras)).toBe(true);
    expect(stewardChildObjectAddHubSubcopy(seasonRootManifesto, extras)).toBe(
      "Season checkpoints (setup)"
    );
  });
});
