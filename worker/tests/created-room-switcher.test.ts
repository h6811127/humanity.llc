import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  beginFirstControlSession,
} from "../../site/js/created-first-session-containment-core.mjs";
import { initCreatedRoomSwitcher } from "../../site/js/created-room-switcher.mjs";
import { STEWARD_ROOM_CHANGED_EVENT, STEWARD_ROOM_WEAR } from "../../site/js/steward-active-room-core.mjs";

function makeStorage() {
  const storage = new Map<string, string>();
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, String(value));
    },
  };
}

/**
 * @param {Record<string, unknown>} nodes
 * @param {string[]} [heard]
 */
function mockDocument(nodes, heard = []) {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      getElementById: (id: string) => nodes[id] ?? null,
      dispatchEvent: (ev: { type?: string; detail?: { room?: string } }) => {
        if (ev?.type === STEWARD_ROOM_CHANGED_EVENT) {
          heard.push(ev.detail?.room ?? "");
        }
        return true;
      },
      addEventListener: () => {},
    },
  });
  return heard;
}

describe("created-room-switcher", () => {
  /** @type {ReturnType<typeof makeStorage>} */
  let sessionStore;
  /** @type {ReturnType<typeof makeStorage>} */
  let localStore;

  beforeEach(() => {
    // @ts-expect-error test polyfills
    globalThis.HTMLButtonElement = class HTMLButtonElement {};
    // @ts-expect-error test polyfills
    globalThis.HTMLDetailsElement = class HTMLDetailsElement {};
    sessionStore = makeStorage();
    localStore = makeStorage();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: sessionStore,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStore,
    });
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { search: "", hash: "" },
    });
  });

  afterEach(() => {
    // @ts-expect-error restore
    delete globalThis.sessionStorage;
    // @ts-expect-error restore
    delete globalThis.localStorage;
    // @ts-expect-error restore
    delete globalThis.document;
    // @ts-expect-error restore
    delete globalThis.location;
  });

  it("hides switcher on first control session via sync", async () => {
    const { syncCreatedRoomSwitcher } = await import("../../site/js/created-room-switcher.mjs");
    beginFirstControlSession("prof1", sessionStore, localStore);
    const wrap = { hidden: false };
    mockDocument({ "created-room-switcher-wrap": wrap });
    syncCreatedRoomSwitcher("prof1", { pilot_template: "general" });
    expect(wrap.hidden).toBe(true);
  });

  it("shows switcher on returning control visit via sync", async () => {
    const { syncCreatedRoomSwitcher } = await import("../../site/js/created-room-switcher.mjs");
    const wrap = {
      hidden: true,
      querySelectorAll: () => [],
    };
    mockDocument({
      "created-room-switcher-wrap": wrap,
      "steward-room-crosshint": null,
      "created-deploy-print": null,
    });
    syncCreatedRoomSwitcher("prof1", { pilot_template: "general" });
    expect(wrap.hidden).toBe(false);
  });

  it("calls onRoomApplied when a room button is clicked", () => {
    function roomBtn(room: string) {
      const btn = Object.assign(new HTMLButtonElement(), {
        dataset: { stewardRoom: room },
        classList: { toggle: () => {} },
        setAttribute: () => {},
        __click: () => {},
      });
      btn.addEventListener = (_: string, fn: () => void) => {
        btn.__click = fn;
      };
      return btn;
    }
    const wearBtn = roomBtn(STEWARD_ROOM_WEAR);
    const doorsBtn = roomBtn("doors");
    const seasonBtn = roomBtn("season");
    const wrap = {
      hidden: false,
      querySelectorAll: (sel: string) => {
        if (sel === "[data-steward-room]") return [doorsBtn, wearBtn, seasonBtn];
        return [];
      },
    };
    const printPanel = Object.assign(new HTMLDetailsElement(), {
      id: "created-deploy-print",
      hidden: false,
      open: false,
    });
    const applied: string[] = [];
    mockDocument({
      "created-room-switcher-wrap": wrap,
      "created-room-switcher-handle": { textContent: "" },
      "steward-room-crosshint": null,
      "created-deploy-print": printPanel,
    });

    initCreatedRoomSwitcher({
      profileId: "prof1",
      getSession: () => ({ pilot_template: "general", handle: "cafe" }),
      onRoomApplied: (room) => applied.push(room),
    });

    wearBtn.__click();
    expect(applied).toContain(STEWARD_ROOM_WEAR);
    expect(printPanel.open).toBe(true);
  });

  it("dispatches room-changed event on switch", () => {
    const heard: string[] = [];
    function roomBtn(room: string) {
      const btn = Object.assign(new HTMLButtonElement(), {
        dataset: { stewardRoom: room },
        classList: { toggle: () => {} },
        setAttribute: () => {},
        __click: () => {},
      });
      btn.addEventListener = (_: string, fn: () => void) => {
        btn.__click = fn;
      };
      return btn;
    }
    const wearBtn = roomBtn(STEWARD_ROOM_WEAR);
    const doorsBtn = roomBtn("doors");
    const seasonBtn = roomBtn("season");
    const wrap = {
      hidden: false,
      querySelectorAll: (sel: string) => {
        if (sel === "[data-steward-room]") return [doorsBtn, wearBtn, seasonBtn];
        return [];
      },
    };
    mockDocument(
      {
        "created-room-switcher-wrap": wrap,
        "created-room-switcher-handle": { textContent: "" },
        "steward-room-crosshint": null,
        "created-deploy-print": Object.assign(new HTMLDetailsElement(), {
          hidden: false,
          open: false,
        }),
      },
      heard
    );

    initCreatedRoomSwitcher({
      profileId: "prof1",
      getSession: () => ({ pilot_template: "general" }),
    });
    wearBtn.__click();
    expect(heard).toContain(STEWARD_ROOM_WEAR);
  });
});
