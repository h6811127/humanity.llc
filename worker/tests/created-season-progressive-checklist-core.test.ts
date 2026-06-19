import { describe, expect, it } from "vitest";

import {
  assessSeasonProgressiveChecklist,
  countRegisteredGameNodes,
  shouldShowSeasonProgressiveChecklist,
} from "../../site/js/created-season-progressive-checklist-core.mjs";
import { STEWARD_ROOM_SEASON } from "../../site/js/steward-active-room-core.mjs";

describe("assessSeasonProgressiveChecklist", () => {
  it("marks identity done when organizer issuer key present", () => {
    const result = assessSeasonProgressiveChecklist({
      profileId: "p1",
      walletEntry: { issuer_public_key: "org_pub" },
      childObjectRows: [],
    });
    expect(result.steps[0].id).toBe("identity");
    expect(result.steps[0].done).toBe(true);
    expect(result.activeStepId).toBe("first_scan_point");
  });

  it("counts registered game nodes excluding revoked", () => {
    expect(
      countRegisteredGameNodes([
        { object_type: "game_node", status: "active" },
        { object_type: "game_node", status: "revoked" },
        { object_type: "status_plate" },
      ])
    ).toBe(1);
  });
});

describe("shouldShowSeasonProgressiveChecklist", () => {
  it("shows only in season room with profile", () => {
    expect(shouldShowSeasonProgressiveChecklist({ profileId: "", activeRoom: STEWARD_ROOM_SEASON })).toBe(
      false
    );
    expect(shouldShowSeasonProgressiveChecklist({ profileId: "p1", activeRoom: "doors" })).toBe(false);
    expect(
      shouldShowSeasonProgressiveChecklist({ profileId: "p1", activeRoom: STEWARD_ROOM_SEASON })
    ).toBe(true);
  });
});

class FakeElement {
  tagName: string;
  id = "";
  className = "";
  hidden = false;
  textContent = "";
  dataset: Record<string, string> = {};
  parentElement: FakeElement | null = null;
  children: FakeElement[] = [];
  attributes = new Map<string, string>();
  scrollIntoViewCalls: unknown[] = [];
  private listeners = new Map<string, Array<(event: { target: FakeElement }) => void>>();

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  append(...nodes: FakeElement[]) {
    for (const node of nodes) this.appendChild(node);
  }

  appendChild(node: FakeElement) {
    node.parentElement = this;
    this.children.push(node);
    return node;
  }

  replaceChildren(...nodes: FakeElement[]) {
    this.children = [];
    this.append(...nodes);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type: string, listener: (event: { target: FakeElement }) => void) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click() {
    for (const listener of this.listeners.get("click") ?? []) {
      listener({ target: this });
    }
  }

  scrollIntoView(options?: unknown) {
    this.scrollIntoViewCalls.push(options ?? true);
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const matches: FakeElement[] = [];
    const visit = (node: FakeElement) => {
      if (selector.startsWith(".")) {
        const className = selector.slice(1);
        if (node.className.split(/\s+/).includes(className)) matches.push(node);
      } else if (selector.startsWith("#")) {
        if (node.id === selector.slice(1)) matches.push(node);
      } else if (node.tagName.toLowerCase() === selector.toLowerCase()) {
        matches.push(node);
      }
      for (const child of node.children) visit(child);
    };
    for (const child of this.children) visit(child);
    return matches;
  }
}

class FakeDetailsElement extends FakeElement {
  open = false;

  constructor() {
    super("details");
  }
}

function findElement(root: FakeElement, predicate: (node: FakeElement) => boolean): FakeElement | null {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return null;
}

function installChecklistDom(elements: Map<string, FakeElement>) {
  (globalThis as typeof globalThis & { HTMLElement: typeof FakeElement }).HTMLElement = FakeElement;
  (globalThis as typeof globalThis & { HTMLDetailsElement: typeof FakeDetailsElement }).HTMLDetailsElement =
    FakeDetailsElement;
  (globalThis as typeof globalThis & { document: unknown }).document = {
    createElement(tagName: string) {
      return tagName.toLowerCase() === "details"
        ? new FakeDetailsElement()
        : new FakeElement(tagName);
    },
    getElementById(id: string) {
      return elements.get(id) ?? null;
    },
  };
}

function installStorage() {
  const storage = new Map<string, string>();
  storage.set(
    "hc_wallet",
    JSON.stringify([{ profile_id: "p1", issuer_public_key: "org_pub" }])
  );
  const api = {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };
  (globalThis as typeof globalThis & { localStorage: typeof api }).localStorage = api;
  (globalThis as typeof globalThis & { sessionStorage: typeof api }).sessionStorage = api;
}

describe("syncSeasonProgressiveChecklist", () => {
  it("opens the add hub and reveals game-node setup from the first checkpoint CTA", async () => {
    const elements = new Map<string, FakeElement>();
    const panel = new FakeElement("section");
    elements.set("created-season-progressive-checklist", panel);

    const addHub = new FakeDetailsElement();
    addHub.hidden = true;
    const hubBody = new FakeElement("div");
    hubBody.className = "created-child-add-hub-body";
    addHub.appendChild(hubBody);
    elements.set("child-object-add-hub", addHub);

    const gameNodeSection = new FakeElement("section");
    gameNodeSection.hidden = true;
    elements.set("child-object-add-game-node", gameNodeSection);

    const whenPanel = new FakeElement("section");
    elements.set("created-season-when-panel", whenPanel);

    installChecklistDom(elements);
    installStorage();

    const { resetWalletCachesForTests } = await import("../../site/js/device-wallet.mjs");
    resetWalletCachesForTests();
    const { syncSeasonProgressiveChecklist } = await import(
      "../../site/js/created-season-progressive-checklist.mjs"
    );

    syncSeasonProgressiveChecklist({
      profileId: "p1",
      session: null,
      activeRoom: STEWARD_ROOM_SEASON,
    });

    const cta = findElement(panel, (node) => node.tagName === "BUTTON");
    expect(cta?.textContent).toBe("Add first checkpoint");

    cta?.click();

    expect(addHub.hidden).toBe(false);
    expect(addHub.open).toBe(true);
    expect(gameNodeSection.hidden).toBe(false);
    expect(gameNodeSection.parentElement).toBe(hubBody);
    expect(whenPanel.scrollIntoViewCalls).toHaveLength(1);
  });
});
