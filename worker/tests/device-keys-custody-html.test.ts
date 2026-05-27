import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { keysCustodyHtml } from "../../site/js/device-keys-custody.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("device-keys-custody-html", () => {
  it("hub and wallet variants use info emphasis cards with secondary acknowledge", () => {
    const hub = keysCustodyHtml("hub");
    expect(hub).toContain("hc-emphasis-card--info");
    expect(hub).toContain("device-keys-custody--hub");
    expect(hub).toContain("hc-emphasis-card__dot--info");
    expect(hub).toContain("hc-emphasis-card__cta--secondary");
    expect(hub).toContain("data-keys-custody-ack");
    expect(hub).not.toContain("hc-notice--info");
    expect(hub).not.toContain("hc-notice-icon");

    const wallet = keysCustodyHtml("wallet", { importHref: "/wallet/#import" });
    expect(wallet).toContain("hc-emphasis-card--info");
    expect(wallet).toContain("device-keys-custody--wallet");
    expect(wallet).toContain("hc-notice-foot");
    expect(wallet).not.toContain("hc-notice-ack");
  });

  it("created variant stays warn emphasis card", () => {
    const html = keysCustodyHtml("created");
    expect(html).toContain("hc-emphasis-card--warn");
    expect(html).toContain("device-keys-custody--created");
    expect(html).toContain("device-keys-custody-dl");
  });

  it("compact variant uses warn emphasis card without legacy notice", () => {
    const html = keysCustodyHtml("compact");
    expect(html).toContain("hc-emphasis-card--warn");
    expect(html).toContain("device-keys-custody--compact");
    expect(html).not.toContain("hc-notice--warning");
  });

  it("styles use compact stacked emphasis layout for custody cards", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toContain("--hc-emphasis-card-gap-section-compact: 12px");
    expect(styles).toMatch(
      /\.device-keys-custody\.hc-emphasis-card[\s\S]*gap:\s*var\(--hc-emphasis-card-gap-section-compact\)/
    );
    expect(styles).toMatch(
      /\.device-keys-custody\.hc-emphasis-card[\s\S]*justify-content:\s*flex-start/
    );
    expect(styles).toMatch(
      /\.device-keys-custody\.hc-emphasis-card \.hc-emphasis-card__main[\s\S]*flex:\s*none/
    );
    expect(styles).toMatch(
      /\.device-keys-custody\.hc-emphasis-card \.hc-emphasis-card__cta--secondary[\s\S]*min-height:\s*44px/
    );

    const emphasis = readFileSync(join(root, "site/css/hc-emphasis-card.css"), "utf8");
    expect(emphasis).toContain("prefers-reduced-transparency: reduce");
  });
});
