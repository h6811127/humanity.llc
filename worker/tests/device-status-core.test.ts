import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STATUS_PARTIAL_LOAD_ARIA_LABEL } from "../../site/js/device-status-load-error.mjs";

const siteJsDir = path.join(fileURLToPath(new URL("../..", import.meta.url)), "site/js");

const originalGlobals = {
  document: globalThis.document,
  window: globalThis.window,
  navigator: globalThis.navigator,
  location: globalThis.location,
  localStorage: globalThis.localStorage,
  sessionStorage: globalThis.sessionStorage,
};

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function fakeClassList(initial: string[] = []) {
  const classes = new Set(initial);
  return {
    add(...names: string[]) {
      for (const name of names) classes.add(name);
    },
    remove(...names: string[]) {
      for (const name of names) classes.delete(name);
    },
    contains(name: string) {
      return classes.has(name);
    },
    toggle(name: string, force?: boolean) {
      const next = force ?? !classes.has(name);
      if (next) classes.add(name);
      else classes.delete(name);
      return next;
    },
  };
}

function fakeElement(attrs: Record<string, string> = {}) {
  const attrMap = new Map(Object.entries(attrs));
  return {
    dataset: {} as Record<string, string>,
    classList: fakeClassList(),
    addEventListener: vi.fn(),
    setAttribute(name: string, value: string) {
      attrMap.set(name, String(value));
    },
    getAttribute(name: string) {
      return attrMap.get(name) ?? null;
    },
    hasAttribute(name: string) {
      return attrMap.has(name);
    },
  };
}

function installStatusCoreDom({ partial = false } = {}) {
  const dotBtn = fakeElement();
  const dot = fakeElement();
  const topChrome = fakeElement(partial ? { "data-device-status-partial": "" } : {});
  const body = {
    classList: fakeClassList(),
  };
  const elements = new Map<string, ReturnType<typeof fakeElement> | null>([
    ["brand-status-dot-btn", dotBtn],
    ["brand-status-dot", dot],
    ["top-chrome", topChrome],
    ["device-hub", null],
  ]);
  vi.stubGlobal("document", {
    body,
    getElementById(id: string) {
      return elements.get(id) ?? null;
    },
  });
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: false }),
    addEventListener: vi.fn(),
  });
  vi.stubGlobal("navigator", { standalone: false, vibrate: vi.fn() });
  vi.stubGlobal("location", { pathname: "/" });
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("sessionStorage", memoryStorage());
  return { dotBtn, dot };
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  for (const [key, value] of Object.entries(originalGlobals)) {
    if (value === undefined) {
      // @ts-expect-error test restores browser globals in the Node environment
      delete globalThis[key];
    } else {
      // @ts-expect-error test restores browser globals in the Node environment
      globalThis[key] = value;
    }
  }
});

describe("device-status-core", () => {
  it("bootstrap-inner loads core before full status module", () => {
    const src = fs.readFileSync(
      path.join(siteJsDir, "device-status-bootstrap-inner.mjs"),
      "utf8"
    );
    const coreIdx = src.indexOf("device-status-core.mjs");
    const statusIdx = src.indexOf("device-status.mjs");
    expect(coreIdx).toBeGreaterThan(-1);
    expect(statusIdx).toBeGreaterThan(coreIdx);
    expect(src).toMatch(/import\(statusCoreUrl\.href\)[\s\S]*import\(statusModuleUrl\.href\)/);
    expect(src).toMatch(/wireStatusPartialLoadDot/);
  });

  it("device-status.mjs does not register dot click (core owns it)", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status.mjs"), "utf8");
    expect(src).not.toMatch(/dotBtn\?\.addEventListener\("click"/);
    expect(src).toMatch(/device-status-core\.mjs/);
  });

  it("core lazy-loads hub sheet module", () => {
    const src = fs.readFileSync(path.join(siteJsDir, "device-status-core.mjs"), "utf8");
    expect(src).toMatch(/import\s*\(\s*[`'"].*device-hub-sheet\.mjs/i);
    expect(src).not.toMatch(/^\s*import\s+.+\s+from\s+["']\.\/device-hub-sheet\.mjs/i);
  });

  it("keeps partial-load dot aria focused on basic hub availability", async () => {
    const { dotBtn } = installStatusCoreDom({ partial: true });
    const core = await import("../../site/js/device-status-core.mjs");

    core.setNetworkStatus("ok");
    core.applyCoreDot();

    expect(dotBtn.getAttribute("aria-label")).toBe(STATUS_PARTIAL_LOAD_ARIA_LABEL);
    expect(dotBtn.getAttribute("aria-label")).not.toMatch(/resolver online/i);
  });
});
