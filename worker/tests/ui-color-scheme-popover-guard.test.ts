import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(fileURLToPath(new URL("../..", import.meta.url)));

function readSiteCss(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

/** Extract declaration blocks for a selector (top-level rules only). */
function extractRuleBlocks(css: string, selector: string): string[] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{`, "g");
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(css)) !== null) {
    let depth = 0;
    const openBrace = match.index + match[0].length - 1;
    for (let i = openBrace; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") {
        depth--;
        if (depth === 0) {
          blocks.push(css.slice(openBrace + 1, i));
          break;
        }
      }
    }
  }
  return blocks;
}

function assertGuardedRule(
  file: string,
  selector: string,
  options: { require?: string[]; forbid?: string[] }
) {
  const css = readSiteCss(file);
  const blocks = extractRuleBlocks(css, selector);
  expect(blocks.length, `${selector} in ${file}`).toBeGreaterThan(0);
  const body = blocks.join("\n");
  for (const token of options.require ?? []) {
    expect(body, `${selector} in ${file}`).toContain(token);
  }
  for (const banned of options.forbid ?? []) {
    expect(body, `${selector} in ${file}`).not.toContain(banned);
  }
}

const POPOVER_ROOT_TOKENS = [
  "--surface-popover-bg",
  "--surface-popover-bg-glass",
  "--surface-popover-fg",
  "--surface-popover-fg-muted",
  "--surface-popover-accent",
  "--surface-popover-border",
  "--surface-popover-control-bg",
  "--surface-popover-control-fg",
  "--surface-popover-notice-bg",
  "--surface-popover-notice-border",
  "--surface-popover-notice-fg",
  "--surface-popover-crosstab-bg",
  "--surface-popover-crosstab-border",
  "--surface-popover-crosstab-fg",
  "--surface-popover-warn-bg",
  "--surface-popover-warn-border",
  "--surface-popover-warn-fg",
];

describe("UI color scheme popover guard", () => {
  it("defines popover tokens on :root and dark theme", () => {
    const lightRoot = extractRuleBlocks(readSiteCss("site/styles.css"), ":root")[0];
    expect(lightRoot).toBeTruthy();
    for (const token of POPOVER_ROOT_TOKENS) {
      expect(lightRoot).toContain(`${token}:`);
    }

    const darkRoot = extractRuleBlocks(
      readSiteCss("site/css/theme-dark.css"),
      'html[data-theme="dark"]'
    )[0];
    expect(darkRoot).toBeTruthy();
    for (const token of POPOVER_ROOT_TOKENS) {
      expect(darkRoot).toContain(`${token}:`);
    }
    for (const token of [
      "--hc-emphasis-card-fill-active",
      "--hc-emphasis-card-title-fg",
      "--hc-emphasis-card-detail-fg",
    ]) {
      expect(darkRoot).toContain(`${token}:`);
    }
    expect(darkRoot).not.toContain("--hc-emphasis-card-detail-fg: var(--shell-label)");
    expect(darkRoot).toContain("rgba(235, 235, 245, 0.9)");
    for (const token of [
      "--hc-emphasis-card-backdrop",
      "--hc-emphasis-card-fill-info-glass",
      "--hc-emphasis-card-border-warn",
      "--hc-emphasis-card-border-urgent",
    ]) {
      expect(darkRoot).toContain(`${token}:`);
    }
  });

  it("defines emphasis card glass tokens on light :root (phase E)", () => {
    const lightRoot = extractRuleBlocks(readSiteCss("site/styles.css"), ":root")[0];
    expect(lightRoot).toBeTruthy();
    for (const token of [
      "--hc-emphasis-card-backdrop",
      "--hc-emphasis-card-border-neutral",
      "--hc-emphasis-card-fill-active-glass",
      "--hc-emphasis-card-fill-info-glass",
      "--hc-emphasis-card-fill-warn-glass",
      "--hc-emphasis-card-fill-urgent-glass",
      "--hc-emphasis-card-eyebrow-tracking",
      "--hc-emphasis-card-cta-radius",
    ]) {
      expect(lightRoot).toContain(`${token}:`);
    }
  });

  it("loads hc-emphasis-card.css via valid top-of-file @import in styles.css", () => {
    const styles = readSiteCss("site/styles.css");
    const importIdx = styles.indexOf('@import url("./css/hc-emphasis-card.css');
    const rootIdx = styles.indexOf(":root {");
    expect(importIdx).toBeGreaterThanOrEqual(0);
    expect(rootIdx).toBeGreaterThan(importIdx);
    expect(styles.slice(0, rootIdx)).not.toMatch(/^\s*[^{@/][^{]*\{/m);
  });

  it("shell pages link hc-emphasis-card.css before styles.css", () => {
    for (const page of [
      "site/index.html",
      "site/wallet/index.html",
      "site/create/index.html",
      "site/created/index.html",
      "site/organizer-revoke/index.html",
    ]) {
      const html = readSiteCss(page);
      const linkIdx = html.indexOf('href="/css/hc-emphasis-card.css?v=4"');
      const stylesIdx = html.indexOf('href="/styles.css?v=');
      expect(linkIdx, page).toBeGreaterThanOrEqual(0);
      expect(stylesIdx, page).toBeGreaterThan(linkIdx);
    }
  });

  it("keeps migrated shell popover surfaces on semantic tokens", () => {
    assertGuardedRule("site/styles.css", ".hub-card-menu-panel", {
      require: ["--surface-popover-bg", "--surface-popover-fg"],
      forbid: ["rgba(255, 255, 255, 0.96)", "backdrop-filter"],
    });
    assertGuardedRule("site/css/device-shell.css", ".hub-card-menu-panel", {
      require: ["--surface-popover-bg"],
      forbid: ["rgba(255, 255, 255, 0.96)", "backdrop-filter"],
    });
    assertGuardedRule("site/styles.css", ".hub-card-menu-item,\na.hub-card-menu-item", {
      require: ["--surface-popover-fg"],
      forbid: ["color: var(--black)", "color: var(--red)"],
    });
    assertGuardedRule("site/styles.css", ".hub-card-menu-item.hub-remove", {
      require: ["--surface-popover-accent"],
      forbid: ["color: var(--red)"],
    });
    assertGuardedRule("site/styles.css", ".brand-status-popover", {
      require: ["--surface-popover-bg", "--surface-popover-fg"],
    });
    assertGuardedRule("site/styles.css", ".hub-card-status-alert.hc-emphasis-card", {
      require: ["margin: 0 10px 6px"],
      forbid: ["rgba(255, 59, 48, 0.35)", "--surface-popover-bg", "border: 0.5px"],
    });
    assertGuardedRule("site/styles.css", ".device-dot-explainer", {
      require: ["--surface-popover-control-bg", "--surface-popover-border"],
    });
    assertGuardedRule("site/styles.css", ".device-dot-explainer-kicker", {
      require: ["--surface-popover-fg-muted"],
      forbid: ["color: var(--grey)"],
    });
    assertGuardedRule("site/styles.css", ".device-dot-explainer-line", {
      require: ["--surface-popover-fg"],
      forbid: ["color: var(--black)"],
    });
    assertGuardedRule("site/styles.css", ".device-dot-explainer-action", {
      require: ["--surface-popover-accent"],
      forbid: ["color: var(--red)"],
    });
    assertGuardedRule("site/css/device-shell.css", ".device-hub-intro-coachmark", {
      require: ["--surface-popover-bg", "--surface-popover-fg"],
    });
    assertGuardedRule("site/css/device-shell.css", ".device-hub.device-hub--sheet", {
      require: [
        "--surface-popover-bg-glass",
        "--surface-popover-fg",
        "--shell-blur",
      ],
    });
    assertGuardedRule("site/css/device-shell.css", ".device-hub-network-tools", {
      require: [
        "--hc-emphasis-card-fill-warn-glass",
        "--hc-emphasis-card-border-warn",
      ],
    });
    assertGuardedRule("site/css/device-shell.css", ".device-hub-network-tools-eyebrow", {
      require: ["--hc-emphasis-card-eyebrow-warn"],
    });
    assertGuardedRule("site/css/device-shell.css", ".hub-card-item", {
      require: [
        "--hc-emphasis-card-fill-info-glass",
        "--hc-emphasis-card-border-neutral",
        "--hc-emphasis-card-shadow",
        "--hc-emphasis-card-backdrop",
      ],
    });
    assertGuardedRule("site/css/device-shell.css", ".device-inbox-sheet", {
      require: [
        "--surface-popover-bg-glass",
        "--surface-popover-fg",
        "--shell-blur",
      ],
    });
    assertGuardedRule("site/css/device-shell.css", ".device-inbox-backdrop", {
      require: ["--shell-blur"],
      forbid: ["blur(28px)"],
    });
    assertGuardedRule(
      "site/css/device-shell.css",
      ".device-hub-glance-popover .device-hub-glance-btn",
      {
        require: ["--surface-popover-control-bg", "--surface-popover-border"],
        forbid: ["var(--shell-fill)"],
      }
    );
    assertGuardedRule(
      "site/css/device-shell.css",
      ".device-hub-glance-popover .device-hub-glance-row--notice .device-hub-glance-btn",
      {
        require: ["--surface-popover-notice-bg", "--surface-popover-notice-border"],
        forbid: ["rgba(255, 59, 48, 0.1)"],
      }
    );
    assertGuardedRule(
      "site/css/device-shell.css",
      ".device-inbox-sheet .device-browser-notif-prompt",
      {
        require: ["--surface-popover-control-bg", "--surface-popover-border"],
      }
    );
    assertGuardedRule(
      "site/css/device-shell.css",
      ".device-inbox-sheet .device-browser-notif-prompt-copy",
      {
        require: ["--surface-popover-fg"],
      }
    );
    assertGuardedRule("site/css/hc-emphasis-card.css", ".hc-emphasis-card", {
      require: [
        "--hc-emphasis-card-shadow",
        "--hc-emphasis-card-backdrop",
        "--hc-emphasis-card-border-neutral",
      ],
      forbid: ["border: none", "rgba(10, 132, 255, 0.44)"],
    });
    assertGuardedRule("site/css/hc-emphasis-card.css", ".hc-emphasis-card--active", {
      require: ["--hc-emphasis-card-fill-active-glass", "--hc-emphasis-card-border-active"],
      forbid: ["rgba(10, 132, 255, 0.1)"],
    });
    assertGuardedRule("site/css/hc-emphasis-card.css", ".hc-emphasis-card--info", {
      require: ["--hc-emphasis-card-fill-info-glass", "--hc-emphasis-card-border-info"],
    });
    assertGuardedRule("site/css/hc-emphasis-card.css", ".hc-emphasis-card--warn", {
      require: ["--hc-emphasis-card-fill-warn-glass", "--hc-emphasis-card-border-warn"],
    });
    assertGuardedRule("site/css/hc-emphasis-card.css", ".hc-emphasis-card--urgent", {
      require: ["--hc-emphasis-card-fill-urgent-glass", "--hc-emphasis-card-border-urgent"],
    });
    assertGuardedRule("site/css/hc-emphasis-card.css", ".hc-emphasis-card__cta--secondary", {
      require: ["--hc-emphasis-card-cta-secondary-padding"],
      forbid: ["border-radius: 999px"],
    });
    const emphasisCss = readSiteCss("site/css/hc-emphasis-card.css");
    expect(emphasisCss).toContain("prefers-reduced-transparency: reduce");
    expect(emphasisCss).toContain("@supports not");
    assertGuardedRule("site/css/hc-emphasis-card.css", ".hc-emphasis-card__title", {
      require: ["--hc-emphasis-card-title-fg"],
      forbid: ["color: var(--black)", ".wallet-active-label"],
    });
    expect(readSiteCss("site/css/hc-emphasis-card.css")).not.toContain(".wallet-active-");
    assertGuardedRule("site/css/theme-dark.css", "html[data-theme=\"dark\"] .hc-emphasis-card--active", {
      require: ["--hc-emphasis-card-fill-active-glass", "--hc-emphasis-card-border-active"],
    });
    assertGuardedRule(
      "site/css/theme-dark.css",
      'html[data-theme="dark"] .scan-hero.scan-status-panel',
      {
        require: ["--hc-scan-hero-fill", "--hc-scan-hero-shadow"],
      }
    );
    assertGuardedRule("site/css/theme-dark.css", "html[data-theme=\"dark\"] .hc-emphasis-card--urgent", {
      require: ["--hc-emphasis-card-fill-urgent-glass", "--hc-emphasis-card-border-urgent"],
    });
    assertGuardedRule("site/css/theme-dark.css", "html[data-theme=\"dark\"] .hc-emphasis-card--info", {
      require: ["--hc-emphasis-card-fill-info-glass", "--hc-emphasis-card-border-info"],
    });
    assertGuardedRule("site/css/theme-dark.css", "html[data-theme=\"dark\"] .hc-emphasis-card--warn", {
      require: ["--hc-emphasis-card-fill-warn-glass", "--hc-emphasis-card-border-warn"],
    });
    const scanPass = readSiteCss("site/scan-pass.css");
    expect(scanPass).toContain("html[data-theme=\"dark\"] .hc-emphasis-card--info");
    expect(scanPass).toContain("prefers-reduced-transparency: reduce");
    assertGuardedRule("site/scan-pass.css", ":root", {
      require: [
        "--hc-scan-surface-bg",
        "--hc-scan-surface-fg",
        "--hc-scan-surface-fg-muted",
        "--hc-scan-surface-border",
      ],
    });
    assertGuardedRule("site/scan-pass.css", "html[data-theme=\"dark\"]", {
      require: ["--hc-scan-surface-bg", "--hc-scan-surface-fg"],
    });
    assertGuardedRule("site/scan-pass.css", ".scan-trust-details", {
      require: ["var(--hc-scan-surface-bg)", "var(--hc-scan-surface-border)"],
      forbid: ["background: #fff", "background:#fff"],
    });
    assertGuardedRule("site/scan-pass.css", ".scan-trust-tools-title", {
      require: ["var(--hc-scan-surface-fg)"],
      forbid: ["color: var(--black)"],
    });
    assertGuardedRule("site/scan-pass.css", ".scan-page .group-label", {
      require: ["var(--hc-scan-surface-fg-muted)"],
      forbid: ["rgba(60, 60, 67"],
    });
    expect(readSiteCss("site/styles.css")).not.toContain("landing-liquid-glass.css");
    expect(readSiteCss("site/styles.css")).not.toContain(".live-control-notification-inner");
    assertGuardedRule("site/css/theme-dark.css", "a.wallet-chrome-home", {
      require: ["color: var(--red)", "--shell-fill"],
    });
  });
});
