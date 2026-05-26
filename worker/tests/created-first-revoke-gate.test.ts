import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  hasFirstRevokeDone,
  markFirstRevokeDone,
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
});
