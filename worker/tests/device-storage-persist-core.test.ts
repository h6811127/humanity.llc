import { describe, expect, it } from "vitest";

import {
  STORAGE_PERSIST_REQUESTED_KEY,
  isStoragePersistApiAvailable,
  shouldRequestStoragePersist,
  storagePersistAlreadyRequested,
  storagePersistWasDenied,
  storagePersistRequestedFlagValue,
} from "../../site/js/device-storage-persist-core.mjs";

describe("device-storage-persist-core", () => {
  it("exports stable localStorage key", () => {
    expect(STORAGE_PERSIST_REQUESTED_KEY).toBe("hc_storage_persist_requested_v1");
  });

  it("detects persist API", () => {
    expect(isStoragePersistApiAvailable({ persist: async () => true })).toBe(true);
    expect(isStoragePersistApiAvailable({})).toBe(false);
    expect(isStoragePersistApiAvailable(null)).toBe(false);
  });

  it("tracks prior request flag", () => {
    expect(storagePersistAlreadyRequested("1")).toBe(true);
    expect(storagePersistAlreadyRequested("0")).toBe(false);
    expect(storagePersistAlreadyRequested(null)).toBe(false);
  });

  it("requests persist only when wallet has keys and not yet asked", () => {
    expect(
      shouldRequestStoragePersist({
        hasSigningKeysOnDevice: true,
        persistApiAvailable: true,
        alreadyRequested: false,
      })
    ).toBe(true);
    expect(
      shouldRequestStoragePersist({
        hasSigningKeysOnDevice: false,
        persistApiAvailable: true,
        alreadyRequested: false,
      })
    ).toBe(false);
    expect(
      shouldRequestStoragePersist({
        hasSigningKeysOnDevice: true,
        persistApiAvailable: false,
        alreadyRequested: false,
      })
    ).toBe(false);
    expect(
      shouldRequestStoragePersist({
        hasSigningKeysOnDevice: true,
        persistApiAvailable: true,
        alreadyRequested: true,
      })
    ).toBe(false);
  });

  it("records granted vs denied flag values", () => {
    expect(storagePersistRequestedFlagValue(true)).toBe("1");
    expect(storagePersistRequestedFlagValue(false)).toBe("0");
  });

  it("detects denied persist flag (RC-2)", () => {
    expect(storagePersistWasDenied("0")).toBe(true);
    expect(storagePersistWasDenied("1")).toBe(false);
  });
});
