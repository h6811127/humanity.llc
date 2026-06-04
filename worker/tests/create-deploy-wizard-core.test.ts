import { describe, expect, it } from "vitest";

import {
  generalRootManifestoForDeploy,
  isDeployWizardIntent,
  parseDeployChildFields,
  resolveDeploySubmitStrategy,
} from "../../site/js/create-deploy-wizard-core.mjs";

describe("isDeployWizardIntent", () => {
  it("is true for deploy intent and pilot templates", () => {
    expect(isDeployWizardIntent(new URLSearchParams("intent=deploy"))).toBe(true);
    expect(isDeployWizardIntent(new URLSearchParams("template=status_plate"))).toBe(true);
    expect(isDeployWizardIntent(new URLSearchParams(""))).toBe(false);
  });
});

describe("resolveDeploySubmitStrategy", () => {
  const base = {
    searchParams: new URLSearchParams("intent=deploy"),
    template: "status_plate",
    legacyFlatDetailsOpen: false,
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

  it("uses flat legacy when standalone disclosure is open", () => {
    expect(
      resolveDeploySubmitStrategy({
        ...base,
        legacyFlatDetailsOpen: true,
      })
    ).toBe("flat_legacy");
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
    expect(generalRootManifestoForDeploy("river_studio")).toBe("Live objects · @river_studio");
  });
});
