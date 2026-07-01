import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockMountChildObjectAddHubSections = vi.hoisted(() => vi.fn());
const mockFindWalletEntryByProfileId = vi.hoisted(() => vi.fn());
const mockReadChildObjectRows = vi.hoisted(() => vi.fn());

vi.mock("../../site/js/created-child-object-add-hub.mjs", () => ({
  mountChildObjectAddHubSections: mockMountChildObjectAddHubSections,
}));

vi.mock("../../site/js/device-wallet.mjs", () => ({
  findWalletEntryByProfileId: mockFindWalletEntryByProfileId,
}));

vi.mock("../../site/js/child-object-store-core.mjs", () => ({
  readChildObjectRows: mockReadChildObjectRows,
}));

class FakeElement {
  tagName: string;
  children: FakeElement[] = [];
  className = "";
  dataset: Record<string, string> = {};
  hidden = false;
  id = "";
  open = false;
  textContent = "";
  attributes = new Map<string, string>();
  scrollIntoView = vi.fn();
  private listeners = new Map<string, () => void>();

  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
  }

  append(...children: FakeElement[]) {
    this.children.push(...children);
  }

  replaceChildren(...children: FakeElement[]) {
    this.children = children;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }

  click() {
    this.listeners.get("click")?.();
  }

  querySelector(selector: string) {
    const normalized = selector.toUpperCase();
    const stack = [...this.children];
    while (stack.length) {
      const child = stack.shift();
      if (!child) continue;
      if (child.tagName === normalized) return child;
      stack.push(...child.children);
    }
    return null;
  }
}

class FakeDetailsElement extends FakeElement {
  constructor() {
    super("details");
  }
}

function installFakeDom(nodes: Record<string, FakeElement>) {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: (tagName: string) => new FakeElement(tagName),
      getElementById: (id: string) => nodes[id] ?? null,
    },
  });
}

describe("created-season-progressive-checklist", () => {
  beforeEach(() => {
    vi.resetModules();
    mockMountChildObjectAddHubSections.mockClear();
    mockFindWalletEntryByProfileId.mockReturnValue({ issuer_public_key: "organizer_pub" });
    mockReadChildObjectRows.mockReturnValue([]);
    // @ts-expect-error test polyfill
    globalThis.HTMLElement = FakeElement;
    // @ts-expect-error test polyfill
    globalThis.HTMLDetailsElement = FakeDetailsElement;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error restore
    delete globalThis.document;
    // @ts-expect-error restore
    delete globalThis.localStorage;
    // @ts-expect-error restore
    delete globalThis.HTMLElement;
    // @ts-expect-error restore
    delete globalThis.HTMLDetailsElement;
  });

  it("opens the add hub and game-node form from the first-checkpoint step", async () => {
    const panel = new FakeElement("section");
    const addHub = new FakeDetailsElement();
    addHub.hidden = true;
    const whenPanel = new FakeElement("section");
    const gameNodeSection = new FakeElement("section");
    gameNodeSection.hidden = true;
    installFakeDom({
      "created-season-progressive-checklist": panel,
      "child-object-add-hub": addHub,
      "created-season-when-panel": whenPanel,
      "child-object-add-game-node": gameNodeSection,
    });

    const { syncSeasonProgressiveChecklist } = await import(
      "../../site/js/created-season-progressive-checklist.mjs"
    );

    syncSeasonProgressiveChecklist({
      profileId: "prof-season",
      session: { profile_id: "prof-season" },
      activeRoom: "season",
    });

    const button = panel.querySelector("button");
    expect(button?.textContent).toBe("Add first checkpoint");

    button?.click();

    expect(mockMountChildObjectAddHubSections).toHaveBeenCalledTimes(1);
    expect(addHub.hidden).toBe(false);
    expect(addHub.open).toBe(true);
    expect(gameNodeSection.hidden).toBe(false);
    expect(whenPanel.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });
});
