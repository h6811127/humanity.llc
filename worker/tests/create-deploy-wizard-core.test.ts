import { describe, expect, it } from "vitest";

import {
  DEPLOY_OBJECT_TYPE_OPTIONS,
  childObjectTypeForDeployTemplate,
  deployNameStepCopy,
  deployObjectTypeOptionByTemplate,
  generalRootManifestoForDeploy,
  isCreateRoomIsolatedIntent,
  isDeployRoomCreateIntent,
  isDeployWizardIntent,
  normalizeDeployObjectTemplate,
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

describe("Simple Object Create object type step", () => {
  it("offers QR sign and return tag as deploy object types", () => {
    expect(DEPLOY_OBJECT_TYPE_OPTIONS.map((option) => option.template)).toEqual([
      "status_plate",
      "lost_item_relay",
    ]);
    expect(DEPLOY_OBJECT_TYPE_OPTIONS.map((option) => option.title)).toEqual([
      "QR sign",
      "Return tag",
    ]);
  });

  it("normalizes unknown deploy object templates to QR sign", () => {
    expect(normalizeDeployObjectTemplate("lost_item_relay")).toBe("lost_item_relay");
    expect(normalizeDeployObjectTemplate("status_plate")).toBe("status_plate");
    expect(normalizeDeployObjectTemplate("unknown")).toBe("status_plate");
    expect(deployObjectTypeOptionByTemplate("lost_item_relay")?.title).toBe("Return tag");
  });

  it("maps return tag selection to the lost-item child object type", () => {
    expect(childObjectTypeForDeployTemplate("lost_item_relay")).toBe("lost_item_relay");
    expect(childObjectTypeForDeployTemplate("status_plate")).toBe("status_plate");
    expect(childObjectTypeForDeployTemplate("unknown")).toBe("status_plate");
  });

  it("names the next step by selected object type", () => {
    expect(deployNameStepCopy("status_plate")).toMatchObject({
      step: "Step 2 · Name it",
      label: "Name this QR sign",
      placeholder: "Studio door",
    });
    expect(deployNameStepCopy("lost_item_relay")).toMatchObject({
      step: "Step 2 · Name it",
      label: "Name this return tag",
      placeholder: "House keys",
    });
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

  it("uses root_and_child when entry gate bypass is active", () => {
    expect(
      resolveDeploySubmitStrategy({
        ...base,
        gateBypass: true,
        walletEntries: [
          {
            pilot_template: "general",
            profile_id: "prof_root",
            owner_private_key_b58: "priv",
          },
        ],
      })
    ).toBe("root_and_child");
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

  it("parses return tag deploy fields from relay item and message", () => {
    expect(
      parseDeployChildFields("lost_item_relay", {
        objectLabel: "Ignored QR sign label",
        statusLine: "Ignored sign status",
        relayItem: "  House keys  ",
        relayMessage: "  Text the relay code on the tag.  ",
      })
    ).toEqual({
      publicLabel: "House keys",
      publicState: "Text the relay code on the tag.",
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
