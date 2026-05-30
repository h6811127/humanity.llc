import { describe, expect, it } from "vitest";

import {
  hubPersonalizedRenderDeferred,
  hubSavedListRenderDeferred,
  shouldDeferHubPersonalizedRenderUntilShellBoot,
  shouldDeferHubSavedListRenderUntilShellBoot,
} from "../../site/js/device-hub-boot-core.mjs";
import {
  DEVICE_BOOT_LOCAL,
  DEVICE_BOOT_PENDING,
  DEVICE_BOOT_READY,
} from "../../site/js/device-shell-boot-core.mjs";

describe("shouldDeferHubPersonalizedRenderUntilShellBoot", () => {
  it("defers when boot is missing, pending, or local", () => {
    expect(shouldDeferHubPersonalizedRenderUntilShellBoot(undefined)).toBe(true);
    expect(shouldDeferHubPersonalizedRenderUntilShellBoot("")).toBe(true);
    expect(shouldDeferHubPersonalizedRenderUntilShellBoot(DEVICE_BOOT_PENDING)).toBe(true);
    expect(shouldDeferHubPersonalizedRenderUntilShellBoot(DEVICE_BOOT_LOCAL)).toBe(true);
  });

  it("allows render when boot is ready", () => {
    expect(shouldDeferHubPersonalizedRenderUntilShellBoot(DEVICE_BOOT_READY)).toBe(false);
  });
});

describe("shouldDeferHubSavedListRenderUntilShellBoot", () => {
  it("defers only while pending", () => {
    expect(shouldDeferHubSavedListRenderUntilShellBoot(DEVICE_BOOT_PENDING)).toBe(true);
    expect(shouldDeferHubSavedListRenderUntilShellBoot(DEVICE_BOOT_LOCAL)).toBe(false);
    expect(shouldDeferHubSavedListRenderUntilShellBoot(DEVICE_BOOT_READY)).toBe(false);
  });
});

describe("hub render deferred helpers", () => {
  it("reads body dataset.boot from a document", () => {
    const doc = {
      body: { dataset: { boot: DEVICE_BOOT_PENDING } },
    };
    expect(hubPersonalizedRenderDeferred(/** @type {Document} */ (doc))).toBe(true);
    expect(hubSavedListRenderDeferred(/** @type {Document} */ (doc))).toBe(true);
    doc.body.dataset.boot = DEVICE_BOOT_LOCAL;
    expect(hubPersonalizedRenderDeferred(/** @type {Document} */ (doc))).toBe(true);
    expect(hubSavedListRenderDeferred(/** @type {Document} */ (doc))).toBe(false);
    doc.body.dataset.boot = DEVICE_BOOT_READY;
    expect(hubPersonalizedRenderDeferred(/** @type {Document} */ (doc))).toBe(false);
    expect(hubSavedListRenderDeferred(/** @type {Document} */ (doc))).toBe(false);
  });
});
