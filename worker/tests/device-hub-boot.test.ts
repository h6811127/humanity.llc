import { describe, expect, it } from "vitest";

import {
  hubPersonalizedRenderDeferred,
  shouldDeferHubPersonalizedRenderUntilShellBoot,
} from "../../site/js/device-hub-boot-core.mjs";
import {
  DEVICE_BOOT_PENDING,
  DEVICE_BOOT_READY,
} from "../../site/js/device-shell-boot-core.mjs";

describe("shouldDeferHubPersonalizedRenderUntilShellBoot", () => {
  it("defers when boot is missing or pending", () => {
    expect(shouldDeferHubPersonalizedRenderUntilShellBoot(undefined)).toBe(true);
    expect(shouldDeferHubPersonalizedRenderUntilShellBoot("")).toBe(true);
    expect(shouldDeferHubPersonalizedRenderUntilShellBoot(DEVICE_BOOT_PENDING)).toBe(true);
  });

  it("allows render when boot is ready", () => {
    expect(shouldDeferHubPersonalizedRenderUntilShellBoot(DEVICE_BOOT_READY)).toBe(false);
  });
});

describe("hubPersonalizedRenderDeferred", () => {
  it("reads body dataset.boot from a document", () => {
    const doc = {
      body: { dataset: { boot: DEVICE_BOOT_PENDING } },
    };
    expect(hubPersonalizedRenderDeferred(/** @type {Document} */ (doc))).toBe(true);
    doc.body.dataset.boot = DEVICE_BOOT_READY;
    expect(hubPersonalizedRenderDeferred(/** @type {Document} */ (doc))).toBe(false);
  });
});
