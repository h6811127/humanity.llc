import { describe, expect, it } from "vitest";

import {
  buildDeploySuccessCreatedUrl,
  deployEndpointOutcomeFromParams,
  deployEndpointTypeFromParams,
  deploySuccessObjectIdFromParams,
  deploySuccessSuppressesAddForm,
  isDeploySuccessLanding,
  readDeploySuccessPresentationState,
  writeDeploySuccessPresentationState,
} from "../../site/js/created-deploy-success-focus-core.mjs";

describe("created-deploy-success-focus-core", () => {
  it("detects deploy success landing params", () => {
    expect(isDeploySuccessLanding("deploy_success=1")).toBe(true);
    expect(isDeploySuccessLanding(new URLSearchParams())).toBe(false);
  });

  it("maps endpoint type to sign or tag outcome", () => {
    expect(
      deployEndpointOutcomeFromParams(
        new URLSearchParams("deploy_success=1&endpoint=status_plate")
      )
    ).toBe("sign");
    expect(
      deployEndpointOutcomeFromParams(
        new URLSearchParams("deploy_success=1&endpoint=lost_item_relay")
      )
    ).toBe("tag");
  });

  it("reads object id from deploy success params", () => {
    expect(
      deploySuccessObjectIdFromParams(
        new URLSearchParams("object_id=obj_abc123")
      )
    ).toBe("obj_abc123");
  });

  it("builds created URL focused on minted child endpoint", () => {
    const href = buildDeploySuccessCreatedUrl({
      origin: "https://humanity.llc",
      profileId: "prof_abc",
      qrId: "qr_child_01",
      objectId: "obj_door_01",
      objectType: "status_plate",
    });
    const url = new URL(href);
    expect(url.pathname).toBe("/created/");
    expect(url.searchParams.get("profile_id")).toBe("prof_abc");
    expect(url.searchParams.get("qr_id")).toBe("qr_child_01");
    expect(url.searchParams.get("fresh")).toBe("1");
    expect(url.searchParams.get("deploy_success")).toBe("1");
    expect(deployEndpointTypeFromParams(url.searchParams)).toBe("status_plate");
    expect(url.searchParams.get("object_id")).toBe("obj_door_01");
    expect(url.hash).toBe("#child-object-obj_door_01");
  });

  it("records presentation state for post-refresh add-form suppression", () => {
    const storage = new Map<string, string>();
    const sessionStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };
    writeDeploySuccessPresentationState(
      {
        profileId: "prof_abc",
        objectId: "obj_door_01",
        endpointType: "status_plate",
      },
      sessionStorage
    );
    expect(readDeploySuccessPresentationState(sessionStorage)?.objectId).toBe("obj_door_01");
    expect(deploySuccessSuppressesAddForm("status_plate", sessionStorage)).toBe(true);
  });
});
