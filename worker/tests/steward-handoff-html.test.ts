import { describe, expect, it } from "vitest";

import {
  renderStewardHandoffErrorPage,
  renderStewardHandoffInterstitialPage,
} from "../src/resolver/steward-handoff-html";
import {
  STEWARD_HANDOFF_INTERSTITIAL_CONTINUE,
  STEWARD_HANDOFF_INTERSTITIAL_COPY,
  STEWARD_HANDOFF_INTERSTITIAL_DETAIL,
  STEWARD_HANDOFF_INTERSTITIAL_EYEBROW,
  STEWARD_HANDOFF_INTERSTITIAL_TITLE,
} from "../../site/js/steward-handoff-interstitial-copy-core.mjs";

const ORIGIN = "https://humanity.llc";

describe("renderStewardHandoffInterstitialPage", () => {
  it("renders interstitial copy and continues to escaped scan URLs", () => {
    const scanUrl =
      'https://humanity.llc/c/abc?q=qr_1&x="<img src=x onerror=alert(1)>"';
    const continueUrl = `${scanUrl}&go=1`;
    const html = renderStewardHandoffInterstitialPage({
      origin: ORIGIN,
      scanUrl,
      continueUrl,
    });

    expect(html).toContain(STEWARD_HANDOFF_INTERSTITIAL_EYEBROW);
    expect(html).toContain(STEWARD_HANDOFF_INTERSTITIAL_TITLE);
    expect(html).toContain(STEWARD_HANDOFF_INTERSTITIAL_DETAIL);
    expect(html).toContain(STEWARD_HANDOFF_INTERSTITIAL_COPY);
    expect(html).toContain(STEWARD_HANDOFF_INTERSTITIAL_CONTINUE);
    expect(html).toContain("No automatic redirect");
    expect(html).toContain('id="steward-handoff-copy"');
    expect(html).toContain('href="https://humanity.llc/c/abc?q=qr_1&amp;x=&quot;&lt;img src=x onerror=alert(1)&gt;&quot;&amp;go=1"');
    expect(html).not.toContain('onerror=alert(1)">');
    // JSON script payload keeps the raw URL for clipboard copy.
    expect(html).toContain(JSON.stringify(scanUrl));
  });

  it("escapes origin in asset URLs", () => {
    const html = renderStewardHandoffInterstitialPage({
      origin: 'https://evil.example/" onclick="alert(1)',
      scanUrl: "https://humanity.llc/c/abc?q=qr_1",
      continueUrl: "https://humanity.llc/c/abc?q=qr_1&go=1",
    });
    expect(html).toContain(
      'href="https://evil.example/&quot; onclick=&quot;alert(1)/assets/red_qr_transparent_bg.png"'
    );
    expect(html).not.toContain('onclick="alert(1)');
  });
});

describe("renderStewardHandoffErrorPage", () => {
  it("escapes attacker-controlled error messages and origin", () => {
    const html = renderStewardHandoffErrorPage(
      '<script>alert("xss")</script>',
      'https://humanity.llc/"/><script>alert(1)</script>'
    );
    expect(html).toContain("This handoff link is invalid");
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain(
      'href="https://humanity.llc/&quot;/&gt;&lt;script&gt;alert(1)&lt;/script&gt;/"'
    );
  });
});
