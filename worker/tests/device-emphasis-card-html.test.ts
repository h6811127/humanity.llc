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
    expect(html).toContain("styles.css?v=123");
  });

  it("landing final CTA uses urgent emphasis card and standard CTA", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("hc-emphasis-card--urgent landing-final-cta");
    expect(html).toContain("hc-emphasis-card__cta landing-final-cta-btn");
    expect(html).not.toContain("landing-cta-glass");
    expect(html).not.toMatch(/landing-final-cta-btn[^>]*landing-hero-btn/);
    expect(html).not.toMatch(
      /landing-final-cta[^>]*>\s*<h2 class="landing-final-cta-title"/
    );
  });

  it("emphasis card spacing tokens on :root and component css", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toContain("--hc-emphasis-card-gap-section: 24px");
    expect(styles).toContain("--hc-emphasis-card-gap-dot: 14px");
    expect(styles).toContain('hc-emphasis-card.css?v=3');
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

  it("landing framing uses info emphasis card and secondary row link", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("hc-emphasis-card--info landing-framing");
    expect(html).toContain("hc-emphasis-card__cta--secondary landing-framing-more-link");
    expect(html).toContain("landing-framing-more-actions");
    expect(html).not.toContain("landing-cta-glass");
    expect(html).not.toContain('class="landing-framing-tab"');
  });

  it("landing hero primary uses shared emphasis card CTA class", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain('class="hc-emphasis-card__cta landing-hero-btn-primary"');
    expect(html).not.toMatch(/landing-hero-btn\s+landing-hero-btn-primary/);
  });

  it("emphasis card phase B tokens and CTA metrics in component css", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toContain("--hc-emphasis-card-fill-active-glass");
    expect(styles).toContain("--hc-emphasis-card-border-active");
    expect(styles).toContain("--hc-emphasis-card-eyebrow-tracking: 0.025em");
    const emphasis = readFileSync(join(root, "site/css/hc-emphasis-card.css"), "utf8");
    expect(emphasis).toContain("backdrop-filter: var(--hc-emphasis-card-backdrop)");
    expect(emphasis).toContain("border: 0.5px solid var(--hc-emphasis-card-border-neutral)");
    expect(emphasis).toMatch(/border-radius:\s*var\(--hc-emphasis-card-cta-radius/);
    expect(emphasis).toContain("prefers-reduced-transparency: reduce");
  });

  it("styles do not import withdrawn landing liquid glass", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).not.toContain("landing-liquid-glass.css");
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

  it("created vouch return banner uses active emphasis card markup", () => {
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain('id="created-vouch-return-banner"');
    expect(html).toContain("hc-emphasis-card--active");
    expect(html).toContain('class="hc-emphasis-card__cta" id="created-vouch-return-link"');
    expect(html).not.toContain("created-vouch-return-text");
    expect(html).not.toContain("btn-primary created-vouch-return-btn");

    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toMatch(
      /#created-vouch-return-banner\.hc-emphasis-card[\s\S]*flex-direction:\s*column/
    );
  });

  it("created showError only updates created-error-detail", () => {
    const src = readFileSync(join(root, "site/js/created.mjs"), "utf8");
    expect(src).toContain('getElementById("created-error-detail")');
    const showErrorFn = src.match(/function showError\(msg\) \{[\s\S]*?\n\}/);
    expect(showErrorFn?.[0]).toContain("errorDetailEl.textContent");
    expect(showErrorFn?.[0]).not.toContain("innerHTML");

    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain('id="created-error-detail"');
    expect(html).not.toMatch(/id="created-error"[^>]*form-warning/);
  });

  it("create flow warnings use emphasis card without legacy form-warning class", () => {
    const html = readFileSync(join(root, "site/create/index.html"), "utf8");
    expect(html).toContain('id="create-public-card-notice"');
    expect(html).toContain("hc-emphasis-card--warn flow-form-warning");
    expect(html).not.toContain("form-warning flow-form-warning");
  });

  it("scan bundle propagates phase B/C emphasis tokens and dark glass rules", () => {
    const scanPass = readFileSync(join(root, "site/scan-pass.css"), "utf8");
    expect(scanPass).toContain("--hc-emphasis-card-fill-active-glass");
    expect(scanPass).toContain("--hc-emphasis-card-border-info");
    expect(scanPass).toMatch(
      /html\[data-theme="dark"\] \.hc-emphasis-card--info[\s\S]*--hc-emphasis-card-fill-info-glass/
    );
    expect(scanPass).toContain("prefers-reduced-transparency: reduce");
  });

  it("shell pages bust styles and theme-dark for emphasis alignment", () => {
    for (const page of ["site/wallet/index.html", "site/create/index.html", "site/created/index.html"]) {
      const html = readFileSync(join(root, page), "utf8");
      expect(html).toContain("styles.css?v=123");
      expect(html).toContain("theme-dark.css?v=26");
      expect(html).toContain("device-shell.css?v=51");
    }
  });

  it("phase E: no withdrawn landing glass in site sources", () => {
    const index = readFileSync(join(root, "site/index.html"), "utf8");
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(index + styles).not.toContain("landing-cta-glass");
    expect(styles).not.toContain("landing-liquid-glass.css");
  });

  it("phase E: all semantic modifiers use glass fills in component css", () => {
    const emphasis = readFileSync(join(root, "site/css/hc-emphasis-card.css"), "utf8");
    for (const mod of ["active", "info", "warn", "urgent"] as const) {
      expect(emphasis).toMatch(
        new RegExp(
          `\\.hc-emphasis-card--${mod}[\\s\\S]*--hc-emphasis-card-fill-${mod}-glass`
        )
      );
    }
    expect(emphasis).toContain(".hc-emphasis-card__cta--secondary");
  });

  it("hub saved-card rows use tier-3 emphasis depth (HUB_CARD_3D_AND_SHEET_GLASS)", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    const shell = readFileSync(join(root, "site/css/device-shell.css"), "utf8");
    for (const css of [styles, shell]) {
      expect(css).toContain("--hc-emphasis-card-fill-info-glass");
      expect(css).toContain("--hc-emphasis-card-shadow");
      expect(css).toContain("--hc-emphasis-card-backdrop");
    }
    expect(styles).toMatch(
      /\.hub-card-item[\s\S]*--hc-emphasis-card-fill-info-glass[\s\S]*--hc-emphasis-card-shadow/
    );
    expect(shell).toMatch(
      /\.device-hub\.device-hub--sheet[\s\S]*--surface-popover-bg-glass[\s\S]*--hc-emphasis-card-backdrop/
    );
    const plan = readFileSync(join(root, "docs/HUB_CARD_3D_AND_SHEET_GLASS.md"), "utf8");
    expect(plan).toContain("Steps 1–3 shipped");
  });

  it("phase E: rollout docs mark visual alignment v2 complete", () => {
    const rollout = readFileSync(join(root, "docs/HC_EMPHASIS_CARD_ROLLOUT.md"), "utf8");
    const alignment = readFileSync(
      join(root, "docs/HC_EMPHASIS_CARD_VISUAL_ALIGNMENT.md"),
      "utf8"
    );
    expect(rollout).toContain("Visual alignment v2 shipped");
    expect(alignment).toContain("Shipped E (May 2026)");
  });

  it("cross-tab banners use stacked layout for Safari (shell + scan)", () => {
    const styles = readFileSync(join(root, "site/styles.css"), "utf8");
    expect(styles).toMatch(
      /\.device-cross-tab-banner\.hc-emphasis-card[\s\S]*flex-direction:\s*column/
    );
    expect(styles).toMatch(
      /#wallet-tab-hint\.hc-emphasis-card[\s\S]*flex-direction:\s*column/
    );
    expect(styles).toMatch(
      /#device-hub-crosstab-notice\.hc-emphasis-card[\s\S]*flex-direction:\s*column/
    );

    const scanPass = readFileSync(join(root, "site/scan-pass.css"), "utf8");
    expect(scanPass).toMatch(
      /\.scan-cross-tab-banner\.hc-emphasis-card[\s\S]*flex-direction:\s*column/
    );

    const emphasis = readFileSync(join(root, "site/css/hc-emphasis-card.css"), "utf8");
    expect(emphasis).toContain("-webkit-appearance: none");
    expect(emphasis).toContain(".hc-emphasis-card__actions > *");
  });

  it("hub cross-tab slot uses emphasis card markup", () => {
    const src = readFileSync(join(root, "site/js/device-cross-tab-banner.mjs"), "utf8");
    expect(src).toContain("hubSlot.className = \"device-hub-group hc-emphasis-card hc-emphasis-card--info\"");
    expect(src).toContain("hc-emphasis-card hc-emphasis-card--warn");
    expect(src).not.toContain("device-hub-notice-banner--info");
    expect(src).not.toContain("device-hub-crosstab-card");
  });

  it("keys custody hub and wallet use info emphasis cards", () => {
    const src = readFileSync(join(root, "site/js/device-keys-custody.mjs"), "utf8");
    expect(src).toContain("custodyInfoEmphasisCard");
    expect(src).toContain("device-keys-custody--hub");
    expect(src).toContain("device-keys-custody--wallet");
    expect(src).not.toContain("hc-notice--info");
    expect(src).not.toContain("HC_INFO_ICON");
  });

  it("scan vouch explainer blocks use emphasis card markup", () => {
    const scanHtml = readFileSync(
      join(root, "worker/src/resolver/scan-html.ts"),
      "utf8"
    );
    expect(scanHtml).toContain("hc-emphasis-card--info vouch-explainer");
    expect(scanHtml).toContain('id="vouch-explainer-copy"');
    expect(scanHtml).toContain("hc-emphasis-card--warn vouch-ineligible");
    expect(scanHtml).toContain("hc-emphasis-card--active vouch-success");

    const scanPass = readFileSync(join(root, "site/scan-pass.css"), "utf8");
    expect(scanPass).toMatch(
      /\.vouch-explainer\.hc-emphasis-card[\s\S]*flex-direction:\s*column/
    );

    const vouchIssue = readFileSync(join(root, "site/js/vouch-issue.mjs"), "utf8");
    expect(vouchIssue).toContain("hc-emphasis-card__cta vouch-use-keys-here");
    expect(vouchIssue).toContain("emphasisCardShellHtml");
  });
});
