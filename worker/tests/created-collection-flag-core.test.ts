import { describe, expect, it } from "vitest";

import {
  CREATED_COLLECTION_FLAG_KEY,
  CREATED_COLLECTION_FLAG_QUERY,
  isCreatedCollectionFlagEnabled,
  syncCreatedCollectionFlagDataset,
} from "../../site/js/created-collection-flag-core.mjs";

/** @type {Storage} */
const storage = {
  data: new Map(),
  getItem(key) {
    return this.data.get(key) ?? null;
  },
  setItem(key, value) {
    this.data.set(key, value);
  },
  removeItem(key) {
    this.data.delete(key);
  },
};

describe("created-collection-flag-core", () => {
  it("enables for ?collection=1", () => {
    expect(
      isCreatedCollectionFlagEnabled(new URLSearchParams(`${CREATED_COLLECTION_FLAG_QUERY}=1`), storage)
    ).toBe(true);
  });

  it("enables for localStorage hc_created_collection === 1", () => {
    storage.setItem(CREATED_COLLECTION_FLAG_KEY, "1");
    expect(isCreatedCollectionFlagEnabled(new URLSearchParams(""), storage)).toBe(true);
  });

  it("is false when query and storage are unset", () => {
    storage.removeItem(CREATED_COLLECTION_FLAG_KEY);
    expect(isCreatedCollectionFlagEnabled(new URLSearchParams(""), storage)).toBe(false);
  });

  it("syncCreatedCollectionFlagDataset sets and clears body dataset", () => {
    const doc = {
      body: /** @type {HTMLBodyElement & { dataset: DOMStringMap }} */ ({
        dataset: {},
      }),
    };
    syncCreatedCollectionFlagDataset(doc, true);
    expect(doc.body.dataset.createdCollection).toBe("1");
    syncCreatedCollectionFlagDataset(doc, false);
    expect(doc.body.dataset.createdCollection).toBeUndefined();
  });
});
