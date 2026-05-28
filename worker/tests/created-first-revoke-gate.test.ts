import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  hasFirstRevokeDone,
  isPilotUpdateUnlocked,
  markFirstRevokeDone,
  syncUpdateStatusTaskGate,
} from "../../site/js/created-first-revoke-gate.mjs";

describe("created-first-revoke-gate", () => {
  /** @type {Record<string, string>} */
  let store;

  beforeEach(() => {
    store = {};
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
      },
    });
  });

  afterEach(() => {
    // @ts-expect-error restore
    delete globalThis.sessionStorage;
    // @ts-expect-error restore
    delete globalThis.document;
  });

  it("marks profile after first revoke in session", () => {
    expect(hasFirstRevokeDone("profile_a")).toBe(false);
    markFirstRevokeDone("profile_a");
    expect(hasFirstRevokeDone("profile_a")).toBe(true);
    expect(hasFirstRevokeDone("profile_b")).toBe(false);
  });

  it("ignores empty profile id", () => {
    markFirstRevokeDone("");
    markFirstRevokeDone(null);
    expect(Object.keys(store)).toHaveLength(0);
  });

  it("unlocks status updates for pilot templates before revoke", () => {
    expect(isPilotUpdateUnlocked({ pilot_template: "status_plate" })).toBe(true);
    expect(isPilotUpdateUnlocked({ pilot_template: "lost_item_relay" })).toBe(true);
    expect(isPilotUpdateUnlocked({ manifesto_line: "Studio door\nOpen until 9" })).toBe(true);
    expect(isPilotUpdateUnlocked({ manifesto_line: "[relay] House keys\nText owner" })).toBe(true);
    expect(isPilotUpdateUnlocked({ pilot_template: "general", manifesto_line: "Public line" })).toBe(false);
  });

  it("keeps generic update copy gated until first revoke", () => {
    const elements: Record<string, { hidden: boolean }> = {
      "created-live-scanners-see": { hidden: false },
      "created-scanners-see-gate-hint": { hidden: true },
    };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        getElementById: (id: string) => elements[id] ?? null,
      },
    });

    syncUpdateStatusTaskGate("profile_a", { pilot_template: "general" });
    expect(elements["created-live-scanners-see"].hidden).toBe(true);
    expect(elements["created-scanners-see-gate-hint"].hidden).toBe(false);

    markFirstRevokeDone("profile_a");
    syncUpdateStatusTaskGate("profile_a", { pilot_template: "general" });
    expect(elements["created-live-scanners-see"].hidden).toBe(false);
    expect(elements["created-scanners-see-gate-hint"].hidden).toBe(true);
  });

  it("shows pilot update copy before first revoke", () => {
    const elements: Record<string, { hidden: boolean }> = {
      "created-live-scanners-see": { hidden: true },
      "created-scanners-see-gate-hint": { hidden: false },
    };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        getElementById: (id: string) => elements[id] ?? null,
      },
    });

    syncUpdateStatusTaskGate("profile_a", { pilot_template: "status_plate" });
    expect(elements["created-live-scanners-see"].hidden).toBe(false);
    expect(elements["created-scanners-see-gate-hint"].hidden).toBe(true);
  });
});
