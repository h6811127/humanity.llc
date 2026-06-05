import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  shouldShowAccountFirstSignCta,
  syncCreatedAccountFirstSignCta,
} from "../../site/js/created-account-first-sign-cta.mjs";
import { CREATED_ACCOUNT_FIRST_SIGN_CTA_LABEL } from "../../site/js/created-fresh-presentation-core.mjs";

function makeStorage() {
  const storage = new Map<string, string>();
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, String(value));
    },
  };
}

describe("created-account-first-sign-cta", () => {
  /** @type {Record<string, string>} */
  let store;

  beforeEach(() => {
    store = {};
    // @ts-expect-error test polyfill
    globalThis.HTMLButtonElement = class HTMLButtonElement {};
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: makeStorage(),
    });
  });

  afterEach(() => {
    // @ts-expect-error restore
    delete globalThis.sessionStorage;
    // @ts-expect-error restore
    delete globalThis.document;
  });

  it("shows CTA only on first-session general control", () => {
    const session = makeStorage();
    session.setItem("hc_created_first_control_active:prof1", "1");
    expect(
      shouldShowAccountFirstSignCta({
        mode: "control",
        outcomeKind: "account",
        profileId: "prof1",
        sessionStorage: session,
      })
    ).toBe(true);
    expect(
      shouldShowAccountFirstSignCta({
        mode: "control",
        outcomeKind: "sign",
        profileId: "prof1",
        sessionStorage: session,
      })
    ).toBe(false);
    const returning = makeStorage();
    expect(
      shouldShowAccountFirstSignCta({
        mode: "control",
        outcomeKind: "account",
        profileId: "prof1",
        sessionStorage: returning,
      })
    ).toBe(false);
  });

  it("syncs button visibility and label", () => {
    const session = makeStorage();
    session.setItem("hc_created_first_control_active:prof1", "1");
    const btn = Object.assign(new HTMLButtonElement(), {
      hidden: true,
      textContent: "",
      dataset: {},
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        getElementById: (id: string) =>
          id === "created-account-first-sign-cta" ? btn : null,
      },
    });

    syncCreatedAccountFirstSignCta({
      mode: "control",
      outcomeKind: "account",
      profileId: "prof1",
      sessionStorage: session,
    });
    expect(btn.hidden).toBe(false);
    expect(btn.textContent).toBe(CREATED_ACCOUNT_FIRST_SIGN_CTA_LABEL);
  });
});
