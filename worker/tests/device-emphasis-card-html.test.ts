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

  it("landing index busts styles.css cache when spacing changes", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("styles.css?v=118");
  });

  it("landing final CTA uses urgent emphasis card and glass button", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("hc-emphasis-card--urgent landing-final-cta");
    expect(html).toContain("landing-hero-btn-primary landing-final-cta-btn");
    expect(html).not.toContain("landing-cta-glass");
    expect(html).not.toMatch(
      /landing-final-cta[^>]*>\s*<h2 class="landing-final-cta-title"/
    );
  });

  it("emphasis card spacing tokens on :root and component css", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toContain("--hc-emphasis-card-gap-section: 24px");
    expect(styles).toContain("--hc-emphasis-card-gap-dot: 14px");
    expect(styles).toContain('hc-emphasis-card.css?v=2');
    const emphasis = readFileSync(join(root, "site/css/hc-emphasis-card.css"), "utf8");
    expect(emphasis).toContain("var(--hc-emphasis-card-gap-dot)");
    expect(emphasis).toContain("var(--hc-emphasis-card-gap-copy)");
    expect(styles).toMatch(
      /\.landing-final-cta\.hc-emphasis-card[\s\S]*gap:\s*var\(--hc-emphasis-card-gap-section\)/
    );
  });

  it("landing emphasis cards use stacked flex:none on __main", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toMatch(
      /\.landing-framing\.hc-emphasis-card \.hc-emphasis-card__main[\s\S]*flex:\s*none/
    );
    expect(styles).toMatch(
      /\.landing-final-cta\.hc-emphasis-card \.hc-emphasis-card__main[\s\S]*flex:\s*none/
    );
    expect(styles).toMatch(
      /\.landing-final-cta\.hc-emphasis-card[\s\S]*justify-content:\s*flex-start/
    );
  });

  it("landing framing uses info emphasis card and glass row link", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("hc-emphasis-card--info landing-framing");
    expect(html).toContain('class="landing-framing-more-link"');
    expect(html).not.toContain("landing-cta-glass");
    expect(html).not.toContain('class="landing-framing-tab"');
  });

  it("styles import landing liquid glass near top", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    const head = styles.slice(0, 400);
    expect(head).toContain('@import url("./css/landing-liquid-glass.css")');
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

  it("cross-tab banners use stacked layout for Safari (shell + scan)", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toMatch(
      /\.device-cross-tab-banner\.hc-emphasis-card[\s\S]*flex-direction:\s*column/
    );
    expect(styles).toMatch(
      /#wallet-tab-hint\.hc-emphasis-card[\s\S]*flex-direction:\s*column/
    );

    const scanPass = readFileSync(join(root, "site/scan-pass.css"), "utf8");
    expect(scanPass).toMatch(
      /\.scan-cross-tab-banner\.hc-emphasis-card[\s\S]*flex-direction:\s*column/
    );

    const emphasis = readFileSync(join(root, "site/css/hc-emphasis-card.css"), "utf8");
    expect(emphasis).toContain("-webkit-appearance: none");
    expect(emphasis).toContain(".hc-emphasis-card__actions > *");
  });
});
