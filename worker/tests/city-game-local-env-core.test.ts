import { describe, expect, it } from "vitest";

import {
  ensureCityGameDevVars,
  upsertDevVarLine,
} from "../scripts/city-game-local-env-core.mjs";

describe("city-game-local-env-core", () => {
  it("upserts dev var lines", () => {
    expect(upsertDevVarLine("A=1\n", "B", "2")).toBe("A=1\nB=2\n");
    expect(upsertDevVarLine("A=1\nB=old\n", "B", "2")).toBe("A=1\nB=2\n");
  });

  it("ensures city game vars for localhost", () => {
    const { text, resolverOrigin, pagesOrigin } = ensureCityGameDevVars("", {});
    expect(text).toContain("CITY_GAME_ENABLED=1");
    expect(text).toContain("CITY_GAME_LOCAL_PLAY_OPEN=1");
    expect(text).toContain("SCAN_RESOLVER_ORIGIN=http://127.0.0.1:8787");
    expect(resolverOrigin).toBe("http://127.0.0.1:8787");
    expect(pagesOrigin).toBe("http://127.0.0.1:8788");
  });

  it("preserves existing secrets when patching", () => {
    const { text } = ensureCityGameDevVars("PRINTIFY_API_TOKEN=secret\n", { host: "127.0.0.1" });
    expect(text).toContain("PRINTIFY_API_TOKEN=secret");
    expect(text).toContain("CITY_GAME_ENABLED=1");
  });
});
