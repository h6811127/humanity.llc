import { describe, expect, it } from "vitest";

import { parseBackupFileText } from "../../site/js/key-backup-file-core.mjs";

describe("key backup import (sad-path S4)", () => {
  it("rejects corrupt JSON backup files", () => {
    expect(() => parseBackupFileText("{not valid json")).toThrow(/not valid JSON/i);
    expect(() => parseBackupFileText('{"type":"wrong"}')).toThrow(
      /Not a Humanity Card key backup/i
    );
    expect(() => parseBackupFileText("{}")).toThrow(/Humanity Card key backup|missing required fields/i);
  });
});
