import { describe, expect, it } from "vitest";

import {
  isLiveControlOwnerUrl,
  renderLiveControlOwnerQrSvg,
} from "../src/resolver/scan-qr";

describe("live control owner QR", () => {
  it("accepts official created deeplinks", () => {
    expect(
      isLiveControlOwnerUrl(
        "https://humanity.llc/created/?profile_id=abc&qr_id=qr_x&live_challenge=lc_y"
      )
    ).toBe(true);
  });

  it("rejects non-created URLs", () => {
    expect(isLiveControlOwnerUrl("https://humanity.llc/c/abc?q=qr_x")).toBe(false);
  });

  it("renders compact owner QR markup", async () => {
    const markup = await renderLiveControlOwnerQrSvg(
      "https://humanity.llc/created/?profile_id=abc&qr_id=qr_x&live_challenge=lc_y"
    );
    expect(markup).toContain("live-control-owner-qr");
    expect(markup).toContain("<svg");
  });
});
