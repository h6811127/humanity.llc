import { describe, expect, it } from "vitest";

import { resolveWsLiveVerifyMode } from "../scripts/ws-live-verify-core.mjs";

describe("ws-live-verify-core", () => {
  it("defaults verify:live to the full pre-merge belt", () => {
    expect(resolveWsLiveVerifyMode([])).toEqual({ fast: false });
  });

  it("uses the fast belt only when --fast is explicit", () => {
    expect(resolveWsLiveVerifyMode(["--fast"])).toEqual({ fast: true });
  });

  it("keeps --full as an explicit full-mode no-op for compatibility", () => {
    expect(resolveWsLiveVerifyMode(["--full"])).toEqual({ fast: false });
  });
});
