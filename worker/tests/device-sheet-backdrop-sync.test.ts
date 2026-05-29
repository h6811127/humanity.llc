import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bindSheetLifecycleReconcile,
  syncInboxBackdropForOpenHub,
  syncSheetBackdropClosed,
} from "../../site/js/device-sheet-backdrop-sync.mjs";

describe("syncSheetBackdropClosed", () => {
  it("sets hidden, removes is-visible, and marks aria-hidden", () => {
    const backdrop = {
      hidden: false,
      classList: {
        removed: /** @type {string[]} */ ([]),
        remove(cls) {
          this.removed.push(cls);
        },
      },
      attributes: /** @type {Record<string, string>} */ ({}),
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
    };

    syncSheetBackdropClosed(/** @type {HTMLElement} */ (backdrop));

    expect(backdrop.hidden).toBe(true);
    expect(backdrop.classList.removed).toContain("is-visible");
    expect(backdrop.attributes["aria-hidden"]).toBe("true");
  });

  it("no-ops when backdrop is missing", () => {
    expect(() => syncSheetBackdropClosed(null)).not.toThrow();
  });
});

describe("syncInboxBackdropForOpenHub", () => {
  function mockBackdrop() {
    return {
      hidden: false,
      classList: {
        removed: /** @type {string[]} */ ([]),
        remove(cls) {
          this.removed.push(cls);
        },
      },
      attributes: /** @type {Record<string, string>} */ ({}),
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
    };
  }

  it("clears stuck inbox backdrop when inbox is closed", () => {
    const inboxBackdrop = mockBackdrop();
    const doc = {
      getElementById(id) {
        if (id === "device-inbox-backdrop") return inboxBackdrop;
        if (id === "device-inbox-sheet") {
          return { classList: { contains: (c) => c === "device-inbox-sheet--collapsed" } };
        }
        return null;
      },
      body: { classList: { contains: () => false } },
    };

    syncInboxBackdropForOpenHub(/** @type {Document} */ (doc));

    expect(inboxBackdrop.hidden).toBe(true);
    expect(inboxBackdrop.classList.removed).toContain("is-visible");
  });

  it("leaves inbox backdrop alone when inbox sheet is open", () => {
    const inboxBackdrop = mockBackdrop();
    const doc = {
      getElementById(id) {
        if (id === "device-inbox-backdrop") return inboxBackdrop;
        return null;
      },
      body: { classList: { contains: (c) => c === "device-inbox-sheet-open" } },
    };

    syncInboxBackdropForOpenHub(/** @type {Document} */ (doc));

    expect(inboxBackdrop.hidden).toBe(false);
  });

  it("leaves inbox backdrop alone when inbox sheet DOM is expanded", () => {
    const inboxBackdrop = mockBackdrop();
    const doc = {
      getElementById(id) {
        if (id === "device-inbox-backdrop") return inboxBackdrop;
        if (id === "device-inbox-sheet") {
          return { classList: { contains: (c) => c !== "device-inbox-sheet--collapsed" } };
        }
        return null;
      },
      body: { classList: { contains: () => false } },
    };

    syncInboxBackdropForOpenHub(/** @type {Document} */ (doc));

    expect(inboxBackdrop.hidden).toBe(false);
  });
});

describe("bindSheetLifecycleReconcile", () => {
  /** @type {typeof globalThis.document | undefined} */
  let prevDocument;
  /** @type {typeof globalThis.window | undefined} */
  let prevWindow;
  /** @type {Record<string, () => void>} */
  let docHandlers;
  /** @type {Record<string, () => void>} */
  let winHandlers;

  afterEach(() => {
    if (prevDocument !== undefined) globalThis.document = prevDocument;
    if (prevWindow !== undefined) globalThis.window = prevWindow;
  });

  function installDomMocks() {
    prevDocument = globalThis.document;
    prevWindow = globalThis.window;
    docHandlers = {};
    winHandlers = {};

    // @ts-expect-error minimal document mock
    globalThis.document = {
      visibilityState: "hidden",
      addEventListener(type, handler) {
        docHandlers[type] = handler;
      },
    };
    // @ts-expect-error minimal window mock
    globalThis.window = {
      addEventListener(type, handler) {
        winHandlers[type] = handler;
      },
    };
  }

  it("calls reconcile on visibilitychange when tab becomes visible", () => {
    installDomMocks();
    const reconcile = vi.fn();
    bindSheetLifecycleReconcile(reconcile);

    // @ts-expect-error mock
    globalThis.document.visibilityState = "hidden";
    docHandlers.visibilitychange?.();
    expect(reconcile).not.toHaveBeenCalled();

    // @ts-expect-error mock
    globalThis.document.visibilityState = "visible";
    docHandlers.visibilitychange?.();
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it("calls reconcile on window focus and pageshow", () => {
    installDomMocks();
    const reconcile = vi.fn();
    bindSheetLifecycleReconcile(reconcile);

    winHandlers.focus?.();
    winHandlers.pageshow?.();
    expect(reconcile).toHaveBeenCalledTimes(2);
  });

  it("no-ops when document or window is missing", () => {
    const prevDoc = globalThis.document;
    const prevWin = globalThis.window;
    // @ts-expect-error test override
    globalThis.document = undefined;
    // @ts-expect-error test override
    globalThis.window = undefined;
    expect(() => bindSheetLifecycleReconcile(() => {})).not.toThrow();
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  });
});
