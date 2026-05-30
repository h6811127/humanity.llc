import { describe, expect, it } from "vitest";

import {
  storagePersistWasDenied,
  STORAGE_PERSIST_SETTLED_EVENT,
} from "../../site/js/device-storage-persist-core.mjs";
import {
  shouldShowStoragePersistDeniedNotice,
  STORAGE_PERSIST_DENIED_NOTICE_DISMISS_KEY,
} from "../../site/js/safari-storage-persist-denied-notice-core.mjs";
import { SAFARI_ITP_NOTICE_DISMISS_COOLDOWN_MS } from "../../site/js/safari-itp-storage-notice-core.mjs";

const baseInput = {
  pathname: "/",
  isIosWebKit: true,
  signingKeyCount: 1,
  persistFlag: "0",
  dismissedAtIso: null,
  deviceStatusLoadError: false,
};

describe("storagePersistWasDenied (RC-2)", () => {
  it("detects denied persist flag", () => {
    expect(storagePersistWasDenied("0")).toBe(true);
    expect(storagePersistWasDenied("1")).toBe(false);
    expect(storagePersistWasDenied(null)).toBe(false);
  });

  it("exports settled event name", () => {
    expect(STORAGE_PERSIST_SETTLED_EVENT).toBe("hc-storage-persist-settled");
  });
});

describe("shouldShowStoragePersistDeniedNotice (RC-2)", () => {
  it("shows when iOS shell has signing keys and persist was denied", () => {
    expect(shouldShowStoragePersistDeniedNotice(baseInput)).toBe(true);
    expect(
      shouldShowStoragePersistDeniedNotice({ ...baseInput, pathname: "/wallet/" })
    ).toBe(true);
    expect(
      shouldShowStoragePersistDeniedNotice({ ...baseInput, pathname: "/created/" })
    ).toBe(true);
  });

  it("hides when persist granted, off iOS, no signing keys, or status failed", () => {
    expect(
      shouldShowStoragePersistDeniedNotice({ ...baseInput, persistFlag: "1" })
    ).toBe(false);
    expect(
      shouldShowStoragePersistDeniedNotice({ ...baseInput, isIosWebKit: false })
    ).toBe(false);
    expect(
      shouldShowStoragePersistDeniedNotice({ ...baseInput, signingKeyCount: 0 })
    ).toBe(false);
    expect(
      shouldShowStoragePersistDeniedNotice({ ...baseInput, deviceStatusLoadError: true })
    ).toBe(false);
    expect(
      shouldShowStoragePersistDeniedNotice({ ...baseInput, pathname: "/create/" })
    ).toBe(false);
  });

  it("respects 7-day dismiss snooze", () => {
    const recent = new Date(
      Date.now() - SAFARI_ITP_NOTICE_DISMISS_COOLDOWN_MS + 60_000
    ).toISOString();
    expect(
      shouldShowStoragePersistDeniedNotice({ ...baseInput, dismissedAtIso: recent })
    ).toBe(false);
    const expired = new Date(
      Date.now() - SAFARI_ITP_NOTICE_DISMISS_COOLDOWN_MS - 60_000
    ).toISOString();
    expect(
      shouldShowStoragePersistDeniedNotice({ ...baseInput, dismissedAtIso: expired })
    ).toBe(true);
  });

  it("exports stable dismiss key", () => {
    expect(STORAGE_PERSIST_DENIED_NOTICE_DISMISS_KEY).toBe(
      "hc_storage_persist_denied_notice_dismissed_at"
    );
  });
});
