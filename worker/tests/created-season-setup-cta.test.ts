import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyFirstSessionContainment } from "../../site/js/created-first-session-containment.mjs";
import {
  CREATED_SEASON_SETUP_CTA_LABEL,
  GAME_SEASON_SETUP_CHECKLIST_ID,
  GAME_SEASON_SETUP_DETAILS_ID,
  SEASON_SETUP_COLLAPSED_OPERATOR_IDS,
  shouldShowSeasonSetupCta,
} from "../../site/js/created-season-setup-cta-core.mjs";
import {
  focusSeasonSetupChecklist,
  syncCreatedSeasonSetupCta,
} from "../../site/js/created-season-setup-cta.mjs";
import { CONTROL_SEASON_HERO_LEAD } from "../../site/js/created-fresh-presentation-core.mjs";

vi.mock("../../site/js/created-child-object-add-hub.mjs", () => ({
  mountChildObjectAddHubSections: vi.fn(),
}));

vi.mock("../../site/js/steward-active-room-core.mjs", () => ({
  STEWARD_ROOM_SEASON: "season",
  writePersistedStewardActiveRoom: vi.fn(),
}));

function makeStorage() {
  const storage = new Map<string, string>();
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, String(value));
    },
  };
}

function makeDetails(open = false) {
  return Object.assign(new HTMLDetailsElement(), {
    tagName: "DETAILS",
    open,
    hidden: false,
    scrollIntoView: vi.fn(),
    removeAttribute: vi.fn(function (this: { open: boolean }, name: string) {
      if (name === "open") this.open = false;
    }),
    querySelector: () => ({ textContent: "" }),
  });
}

describe("created-season-setup-cta", () => {
  beforeEach(() => {
    // @ts-expect-error test polyfill
    globalThis.HTMLElement = class HTMLElement {
      getAttributeNames() {
        return [];
      }
    };
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
    // @ts-expect-error restore
    delete globalThis.document?.body;
    vi.clearAllMocks();
  });

  it("shows CTA only on first-session season control", () => {
    const session = makeStorage();
    session.setItem("hc_created_first_control_active:prof1", "1");
    expect(
      shouldShowSeasonSetupCta({
        mode: "control",
        outcomeKind: "season",
        profileId: "prof1",
        sessionStorage: session,
      })
    ).toBe(true);
    expect(
      shouldShowSeasonSetupCta({
        mode: "control",
        outcomeKind: "account",
        profileId: "prof1",
        sessionStorage: session,
      })
    ).toBe(false);
    const returning = makeStorage();
    expect(
      shouldShowSeasonSetupCta({
        mode: "control",
        outcomeKind: "season",
        profileId: "prof1",
        sessionStorage: returning,
      })
    ).toBe(false);
  });

  it("syncs button visibility and label with season hero lead", () => {
    const session = makeStorage();
    session.setItem("hc_created_first_control_active:prof1", "1");
    const btn = Object.assign(new HTMLButtonElement(), {
      hidden: true,
      textContent: "",
      dataset: {},
    });
    const accountBtn = Object.assign(new HTMLButtonElement(), {
      hidden: false,
      textContent: "",
      dataset: {},
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        getElementById: (id: string) => {
          if (id === "created-season-setup-cta") return btn;
          if (id === "created-account-first-sign-cta") return accountBtn;
          return null;
        },
      },
    });

    syncCreatedSeasonSetupCta({
      mode: "control",
      outcomeKind: "season",
      profileId: "prof1",
      sessionStorage: session,
    });
    expect(btn.hidden).toBe(false);
    expect(btn.textContent).toBe(CREATED_SEASON_SETUP_CTA_LABEL);
    expect(accountBtn.hidden).toBe(true);
    expect(CONTROL_SEASON_HERO_LEAD).toBe("Continue setup and add your first checkpoint.");
  });

  it("focusSeasonSetupChecklist opens setup checklist and hides add chrome", () => {
    const hub = makeDetails(false);
    const setup = makeDetails(false);
    const gameSection = Object.assign(new HTMLElement(), { hidden: true });
    const bulk = makeDetails(true);
    const rules = makeDetails(true);
    const checklist = Object.assign(new HTMLElement(), { id: GAME_SEASON_SETUP_CHECKLIST_ID });
    const chrome = Object.assign(new HTMLElement(), { hidden: false });

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        getElementById: (id: string) => {
          if (id === "child-object-add-hub") return hub;
          if (id === "child-object-add-game-node") return gameSection;
          if (id === GAME_SEASON_SETUP_DETAILS_ID) return setup;
          if (id === "child-object-game-node-bulk") return bulk;
          if (id === "child-object-game-node-rules") return rules;
          if (id === GAME_SEASON_SETUP_CHECKLIST_ID) return checklist;
          if (id === "child-object-game-node-setup-custody")
            return Object.assign(new HTMLElement(), { hidden: false });
          return null;
        },
        querySelector: (sel: string) => {
          if (sel.includes("setup-subhead"))
            return Object.assign(new HTMLElement(), { hidden: false });
          if (sel.includes("setup-lead"))
            return Object.assign(new HTMLElement(), { hidden: false });
          return null;
        },
        querySelectorAll: (sel: string) =>
          sel.includes("data-child-object-add-chrome") ? [chrome] : [],
      },
    });

    const target = focusSeasonSetupChecklist("prof1");
    expect(hub.open).toBe(true);
    expect(gameSection.hidden).toBe(false);
    expect(setup.open).toBe(true);
    expect(setup.scrollIntoView).toHaveBeenCalled();
    expect(chrome.hidden).toBe(true);
    expect(target).toBe(checklist);
    expect(bulk.open).toBe(true);
    expect(rules.open).toBe(true);
  });

  it("applyFirstSessionContainment keeps bulk and rules collapsed for season", () => {
    const session = makeStorage();
    session.setItem("hc_created_first_control_active:prof1", "1");
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: session,
    });

    const setup = makeDetails(true);
    const bulk = makeDetails(true);
    const rules = makeDetails(true);
    const addHub = makeDetails(true);
    const body = { dataset: {} as Record<string, string> };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        body,
        getElementById: (id: string) => {
          if (id === "child-object-game-node-setup") return setup;
          if (id === "child-object-game-node-bulk") return bulk;
          if (id === "child-object-game-node-rules") return rules;
          if (id === "child-object-add-hub") return addHub;
          if (id === "created-room-switcher-wrap") return { hidden: false };
          if (id === "status-plate-loop-scorecard") return { hidden: false };
          if (id === "lost-item-loop-scorecard") return { hidden: false };
          if (id === "child-object-game-node-setup-custody") return { hidden: false };
          return null;
        },
        querySelector: () => null,
        querySelectorAll: () => [],
      },
    });

    const applied = applyFirstSessionContainment("prof1", { outcomeKind: "season" });
    expect(applied).toBe(true);
    expect(setup.open).toBe(true);
    expect(bulk.open).toBe(false);
    expect(rules.open).toBe(false);
    expect(addHub.open).toBe(false);
    expect(SEASON_SETUP_COLLAPSED_OPERATOR_IDS).toEqual([
      "child-object-game-node-bulk",
      "child-object-game-node-rules",
    ]);
  });
});
