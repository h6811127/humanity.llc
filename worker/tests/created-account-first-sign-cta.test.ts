import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  focusSignAddSection,
  shouldShowAccountFirstSignCta,
  syncCreatedAccountFirstSignCta,
} from "../../site/js/created-account-first-sign-cta.mjs";
import {
  CONTROL_ACCOUNT_HERO_LEAD,
  CREATED_ACCOUNT_FIRST_SIGN_CTA_LABEL,
} from "../../site/js/created-fresh-presentation-core.mjs";

vi.mock("../../site/js/created-child-object-add-hub.mjs", () => ({
  mountChildObjectAddHubSections: vi.fn(),
}));

vi.mock("../../site/js/steward-active-room-core.mjs", () => ({
  STEWARD_ROOM_DOORS: "doors",
  writePersistedStewardActiveRoom: vi.fn(),
}));

function makeDetails(open = false) {
  return Object.assign(new HTMLDetailsElement(), {
    tagName: "DETAILS",
    open,
    hidden: true,
    scrollIntoView: vi.fn(),
    querySelector: () => ({ textContent: "" }),
  });
}

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
    globalThis.HTMLElement = class HTMLElement {};
    // @ts-expect-error test polyfill
    globalThis.HTMLButtonElement = class HTMLButtonElement extends HTMLElement {};
    // @ts-expect-error test polyfill
    globalThis.HTMLDetailsElement = class HTMLDetailsElement extends HTMLElement {};
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
    vi.clearAllMocks();
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

  it("syncs button visibility and label alongside account hero lead", () => {
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
    expect(CONTROL_ACCOUNT_HERO_LEAD).toContain("sign");
  });

  it("focusSignAddSection opens add hub and reveals sign form chrome", () => {
    const hub = makeDetails(false);
    const form = Object.assign(new HTMLElement(), { hidden: true });
    const section = Object.assign(new HTMLElement(), {
      hidden: true,
      scrollIntoView: vi.fn(),
      querySelectorAll: (sel: string) =>
        sel.includes("data-child-object-add-chrome") ? [form] : [],
    });

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        getElementById: (id: string) => {
          if (id === "child-object-add-hub") return hub;
          if (id === "child-object-add-status-plate") return section;
          return null;
        },
      },
    });

    const target = focusSignAddSection("prof1");
    expect(hub.hidden).toBe(false);
    expect(hub.open).toBe(true);
    expect(section.hidden).toBe(false);
    expect(form.hidden).toBe(false);
    expect(section.scrollIntoView).toHaveBeenCalled();
    expect(target).toBe(section);
  });

  it("focusSignAddSection reveals sign form after child-object refresh hides add chrome", () => {
    const hub = makeDetails(false);
    const form = Object.assign(new HTMLElement(), { hidden: true });
    const section = Object.assign(new HTMLElement(), {
      hidden: true,
      scrollIntoView: vi.fn(),
      querySelectorAll: (sel: string) =>
        sel.includes("data-child-object-add-chrome") ? [form] : [],
    });

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        getElementById: (id: string) => {
          if (id === "child-object-add-hub") return hub;
          if (id === "child-object-add-status-plate") return section;
          return null;
        },
      },
    });

    focusSignAddSection("prof1");
    expect(form.hidden).toBe(false);

    form.hidden = true;
    focusSignAddSection("prof1");
    expect(hub.open).toBe(true);
    expect(form.hidden).toBe(false);
  });

  it("focusSignAddSection keeps add chrome hidden when deploy success suppresses sign form", () => {
    const session = makeStorage();
    session.setItem(
      "hc_created_deploy_success_v1",
      JSON.stringify({ objectId: "obj_1", endpointType: "status_plate" })
    );
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: session,
    });

    const hub = makeDetails(false);
    const section = Object.assign(new HTMLElement(), {
      hidden: true,
      scrollIntoView: vi.fn(),
    });
    const form = Object.assign(new HTMLElement(), { hidden: true });

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        getElementById: (id: string) => {
          if (id === "child-object-add-hub") return hub;
          if (id === "child-object-add-status-plate") return section;
          return null;
        },
        querySelectorAll: (sel: string) =>
          sel.includes("data-child-object-add-chrome") ? [form] : [],
      },
    });

    focusSignAddSection("prof1");
    expect(hub.open).toBe(true);
    expect(section.hidden).toBe(false);
    expect(form.hidden).toBe(true);
  });
});
