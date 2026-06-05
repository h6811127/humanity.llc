import { describe, expect, it } from "vitest";

import {
  clearDeploySuccessPresentationState,
  deploySuccessHubSubcopy,
  deploySuccessHubSummaryTitle,
  deploySuccessSuppressesAddForm,
  readDeploySuccessPresentationState,
  writeDeploySuccessPresentationState,
} from "../../site/js/created-deploy-success-focus-core.mjs";
import { shouldShowChildObjectAddForm } from "../../site/js/steward-child-object-list-policy-core.mjs";

function makeStorage() {
  const storage = new Map<string, string>();
  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };
}

describe("deploy success presentation state", () => {
  it("persists sign deploy success in tab session storage", () => {
    const storage = makeStorage();
    writeDeploySuccessPresentationState(
      {
        profileId: "prof_sign",
        objectId: "obj_door",
        endpointType: "status_plate",
      },
      storage
    );
    expect(readDeploySuccessPresentationState(storage)).toEqual({
      profileId: "prof_sign",
      objectId: "obj_door",
      endpointType: "status_plate",
    });
    expect(deploySuccessSuppressesAddForm("status_plate", storage)).toBe(true);
    expect(deploySuccessSuppressesAddForm("lost_item_relay", storage)).toBe(false);
  });

  it("persists tag deploy success in tab session storage", () => {
    const storage = makeStorage();
    writeDeploySuccessPresentationState(
      {
        profileId: "prof_tag",
        objectId: "obj_keys",
        endpointType: "lost_item_relay",
      },
      storage
    );
    expect(deploySuccessSuppressesAddForm("lost_item_relay", storage)).toBe(true);
    expect(deploySuccessSuppressesAddForm("status_plate", storage)).toBe(false);
  });

  it("does not suppress add forms when redirect_live has no deploy success state", () => {
    const storage = makeStorage();
    clearDeploySuccessPresentationState(storage);
    expect(deploySuccessSuppressesAddForm("status_plate", storage)).toBe(false);
    expect(deploySuccessSuppressesAddForm("lost_item_relay", storage)).toBe(false);
  });

  it("uses endpoint-focused hub copy for sign and tag", () => {
    expect(deploySuccessHubSummaryTitle("status_plate")).toBe("Your sign");
    expect(deploySuccessHubSummaryTitle("lost_item_relay")).toBe("Your tag");
    expect(deploySuccessHubSubcopy("status_plate")).toMatch(/Print, test scan/);
  });

  it("suppresses sign add form after deploy success but not redirect_live", () => {
    const storage = makeStorage();
    const deployRoot = { pilot_template: "general" };
    const doorsExtras = { activeRoom: "doors" as const };

    expect(
      shouldShowChildObjectAddForm(deployRoot, "status_plate", doorsExtras) &&
        !deploySuccessSuppressesAddForm("status_plate", storage)
    ).toBe(true);

    writeDeploySuccessPresentationState(
      {
        profileId: "prof_sign",
        objectId: "obj_door",
        endpointType: "status_plate",
      },
      storage
    );

    expect(
      shouldShowChildObjectAddForm(deployRoot, "status_plate", doorsExtras) &&
        !deploySuccessSuppressesAddForm("status_plate", storage)
    ).toBe(false);
  });

  it("suppresses tag add form after lost-item deploy success", () => {
    const storage = makeStorage();
    writeDeploySuccessPresentationState(
      {
        profileId: "prof_tag",
        objectId: "obj_keys",
        endpointType: "lost_item_relay",
      },
      storage
    );
    expect(deploySuccessSuppressesAddForm("lost_item_relay", storage)).toBe(true);
    expect(deploySuccessSuppressesAddForm("status_plate", storage)).toBe(false);
  });
});
