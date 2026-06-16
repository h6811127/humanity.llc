import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  persistSeasonWhenId,
  readSeasonWhenId,
} from "../../site/js/created-season-when-panel-core.mjs";

describe("created season when panel", () => {
  /** @type {Map<string, string>} */
  let session;

  beforeEach(() => {
    session = new Map();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key) => session.get(key) ?? null,
        setItem: (key, value) => {
          session.set(key, value);
        },
      },
    });
  });

  afterEach(() => {
    delete globalThis.sessionStorage;
  });

  it("persists normalized season id per profile", () => {
    const profileId = "profile_when_test";
    const seasonId = persistSeasonWhenId(profileId, "my_season_01");
    expect(seasonId).toBe("my_season_01");
    expect(readSeasonWhenId(profileId)).toBe("my_season_01");
  });

  it("rejects invalid season id slugs", () => {
    expect(() => persistSeasonWhenId("p2", "bad slug!")).toThrow();
  });

  it("keeps the When panel outside hidden game-node add chrome", () => {
    const html = readFileSync(join(process.cwd(), "site/created/index.html"), "utf8");
    const panelIdx = html.indexOf('id="created-season-when-panel"');
    const controlRootIdx = html.indexOf('id="created-control-root"');
    const formStart = html.indexOf('id="child-object-game-node-form"');
    const formEnd = html.indexOf("</form>", formStart);
    expect(panelIdx).toBeGreaterThan(-1);
    expect(controlRootIdx).toBeGreaterThan(-1);
    expect(formStart).toBeGreaterThan(-1);
    expect(panelIdx).toBeLessThan(controlRootIdx);
    expect(panelIdx).toBeLessThan(formStart);
    expect(html.slice(formStart, formEnd)).not.toContain('id="created-season-when-panel"');
  });
});
