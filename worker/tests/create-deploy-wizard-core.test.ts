import { describe, expect, it } from "vitest";

import {
  generalRootManifestoForDeploy,
  isCreateRoomIsolatedIntent,
  isDeployRoomCreateIntent,
  isDeployWizardIntent,
  parseDeployChildFields,
  resolveDeploySubmitStrategy,
} from "../../site/js/create-deploy-wizard-core.mjs";
import { createHeroCopyForTemplate } from "../../site/js/create-template-copy.mjs";

describe("isDeployWizardIntent", () => {
  it("is true for deploy intent and pilot templates", () => {
    expect(isDeployWizardIntent(new URLSearchParams("intent=deploy"))).toBe(true);
    expect(isDeployWizardIntent(new URLSearchParams("template=status_plate"))).toBe(true);
    expect(isDeployWizardIntent(new URLSearchParams(""))).toBe(false);
  });
});

describe("isDeployRoomCreateIntent", () => {
  it("is true only for intent=deploy (not field-kit template deep links)", () => {
    expect(isDeployRoomCreateIntent(new URLSearchParams("intent=deploy"))).toBe(true);
    expect(isDeployRoomCreateIntent(new URLSearchParams("template=status_plate"))).toBe(false);
    expect(isDeployRoomCreateIntent(new URLSearchParams("intent=wear"))).toBe(false);
    expect(isDeployRoomCreateIntent(new URLSearchParams("intent=game"))).toBe(false);
  });
});

describe("isCreateRoomIsolatedIntent", () => {
  it("is true for deploy, wear, and game room entry only", () => {
    expect(isCreateRoomIsolatedIntent(new URLSearchParams("intent=deploy"))).toBe(true);
    expect(isCreateRoomIsolatedIntent(new URLSearchParams("intent=wear"))).toBe(true);
    expect(isCreateRoomIsolatedIntent(new URLSearchParams("intent=game"))).toBe(true);
    expect(isCreateRoomIsolatedIntent(new URLSearchParams("intent=general"))).toBe(true);
    expect(isCreateRoomIsolatedIntent(new URLSearchParams("template=status_plate"))).toBe(false);
    expect(isCreateRoomIsolatedIntent(new URLSearchParams(""))).toBe(false);
  });
});

describe("createHeroCopyForTemplate — deploy room", () => {
  it("uses deploy-room hero without legacy pilot copy", () => {
    const copy = createHeroCopyForTemplate(
      "status_plate",
      new URLSearchParams("intent=deploy")
    );
    expect(copy.title).toBe("Make a QR sign");
    expect(copy.lead).not.toMatch(/legacy/i);
    expect(copy.lead).toMatch(/scanners should read/i);
  });

  it("keeps field-kit hero on template deep link without legacy pilot jargon", () => {
    const copy = createHeroCopyForTemplate(
      "status_plate",
      new URLSearchParams("template=status_plate")
    );
    expect(copy.lead).not.toMatch(/legacy/i);
    expect(copy.lead).toMatch(/Live/i);
  });
});

describe("resolveDeploySubmitStrategy", () => {
  const base = {
    searchParams: new URLSearchParams("intent=deploy"),
    template: "status_plate",
    walletEntries: [],
  };

  it("bundles root+child when no general root exists", () => {
    expect(resolveDeploySubmitStrategy(base)).toBe("root_and_child");
  });

  it("redirects to Live when a general root with keys exists", () => {
    expect(
      resolveDeploySubmitStrategy({
        ...base,
        walletEntries: [
          {
            pilot_template: "general",
            profile_id: "prof_root",
            owner_private_key_b58: "priv",
          },
        ],
      })
    ).toBe("redirect_live");
  });

  it("uses root_and_child even when legacy compat disclosure is open (flat_legacy retired)", () => {
    expect(resolveDeploySubmitStrategy(base)).toBe("root_and_child");
  });

  it("returns standard for non-deploy flows", () => {
    expect(
      resolveDeploySubmitStrategy({
        ...base,
        searchParams: new URLSearchParams(""),
        template: "general",
      })
    ).toBe("standard");
  });
});

describe("parseDeployChildFields", () => {
  it("parses status plate deploy fields", () => {
    expect(
      parseDeployChildFields("status_plate", {
        objectLabel: "Studio door",
        statusLine: "Open until 9 PM",
        relayItem: "",
        relayMessage: "",
      })
    ).toEqual({
      publicLabel: "Studio door",
      publicState: "Open until 9 PM",
    });
  });
});

describe("generalRootManifestoForDeploy", () => {
  it("uses handle in manifesto line", () => {
    expect(generalRootManifestoForDeploy("river_studio")).toBe(
      "What scanners see · @river_studio"
    );
  });
});
