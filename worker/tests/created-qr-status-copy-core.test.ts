import { describe, expect, it } from "vitest";

import {
  formatCreatedQrStatusCompact,
  formatCreatedQrStatusPhrase,
} from "../../site/js/created-qr-status-copy-core.mjs";

describe("formatCreatedQrStatusPhrase", () => {
  it("maps active network labels to QR active", () => {
    expect(formatCreatedQrStatusPhrase("active")).toBe("QR active");
    expect(formatCreatedQrStatusPhrase("Active")).toBe("QR active");
    expect(formatCreatedQrStatusPhrase("reachable")).toBe("QR active");
  });

  it("returns null for empty placeholders", () => {
    expect(formatCreatedQrStatusPhrase(" - ")).toBeNull();
    expect(formatCreatedQrStatusPhrase("Checking…")).toBeNull();
  });

  it("passes through revoked and expired", () => {
    expect(formatCreatedQrStatusPhrase("revoked")).toBe("QR revoked");
    expect(formatCreatedQrStatusPhrase("expired")).toBe("QR expired");
  });
});

describe("formatCreatedQrStatusCompact", () => {
  it("drops the QR prefix for compact rows", () => {
    expect(formatCreatedQrStatusCompact("active")).toBe("active");
    expect(formatCreatedQrStatusCompact("revoked")).toBe("revoked");
  });
});
