import { describe, expect, it } from "vitest";

import { classifyWalletStorageRaw } from "../../site/js/device-wallet-parse-core.mjs";

describe("classifyWalletStorageRaw", () => {
  it("treats missing storage as empty", () => {
    expect(classifyWalletStorageRaw(null).kind).toBe("empty");
    expect(classifyWalletStorageRaw("").kind).toBe("empty");
  });

  it("parses valid wallet arrays", () => {
    const result = classifyWalletStorageRaw('[{"profile_id":"abc"}]');
    expect(result.kind).toBe("ok");
    expect(result.entries).toHaveLength(1);
  });

  it("flags non-array JSON as corrupt", () => {
    expect(classifyWalletStorageRaw('{"profile_id":"abc"}').kind).toBe("corrupt");
  });

  it("flags invalid JSON as corrupt", () => {
    expect(classifyWalletStorageRaw("{not-json").kind).toBe("corrupt");
  });
});
