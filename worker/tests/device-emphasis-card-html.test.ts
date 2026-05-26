import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
import {
  emphasisCardBodyHtml,
  emphasisCardCtaButton,
  escapeEmphasisHtml,
} from "../../site/js/device-emphasis-card-html.mjs";

describe("device-emphasis-card-html", () => {
  it("escapes HTML in CTA labels", () => {
    expect(emphasisCardCtaButton("<tab>")).not.toContain("<tab>");
    expect(escapeEmphasisHtml(`a&b`)).toBe("a&amp;b");
  });

  it("builds card body with dot modifier", () => {
    const html = emphasisCardBodyHtml({
      eyebrow: "Keys in another tab",
      title: "@demo",
      detail: "Open that tab.",
      dot: "info",
      actionsHtml: emphasisCardCtaButton("Open that tab", 'data-cross-tab-action'),
    });
    expect(html).toContain("hc-emphasis-card__dot--info");
    expect(html).toContain("Keys in another tab");
    expect(html).toContain("data-cross-tab-action");
  });

  it("landing final CTA uses urgent emphasis card and glass button", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("hc-emphasis-card--urgent landing-final-cta");
    expect(html).toContain("landing-cta-glass");
    expect(html).not.toMatch(
      /landing-final-cta[^>]*>\s*<h2 class="landing-final-cta-title"/
    );
  });

  it("hub card disabled-since-visit alert uses warn emphasis card", () => {
    const src = readFileSync(join(root, "site/js/device-hub-ui.mjs"), "utf8");
    expect(src).toContain("hc-emphasis-card--warn hub-card-status-alert");
    expect(src).toContain("hub-card-status-alert-text");
    expect(src).toContain("hub-card-alert-dismiss");
    expect(src).not.toMatch(
      /hub-card-status-alert"[^>]*>\s*<p class="hub-card-status-alert-text"/
    );
  });

  it("phase 4 surfaces use emphasis card markup", () => {
    const created = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(created).toContain('id="no-session-detail"');
    expect(created).toContain('id="owner-revoked-banner-detail"');
    expect(created).toContain('id="created-error-detail"');
    expect(created).toContain("hc-emphasis-card--warn revoke-id-warning");
    expect(created).not.toContain("live-control-notification-inner");

    const createHtml = readFileSync(join(root, "site/create/index.html"), "utf8");
    expect(createHtml).toContain('id="create-public-card-notice"');
    expect(createHtml).toContain("hc-emphasis-card--warn");
    expect(createHtml).not.toContain("hc-notice--warning form-warning flow-form-warning");
  });

  it("created live proof panel uses urgent emphasis card markup", () => {
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain('id="live-control-proof"');
    expect(html).toContain("hc-emphasis-card--urgent");
    expect(html).toContain('class="hc-emphasis-card__cta" id="live-control-proof-btn"');
    expect(html).not.toContain("live-control-notification-inner");
    expect(html).not.toContain("live-control-notification-icon");
  });
});
