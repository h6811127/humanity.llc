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
  });

  it("loads hc-emphasis-card.css via valid top-of-file @import in styles.css", () => {
    const styles = readSiteCss("site/styles.css");
    const importIdx = styles.indexOf('@import url("./css/hc-emphasis-card.css")');
    const rootIdx = styles.indexOf(":root {");
    expect(importIdx).toBeGreaterThanOrEqual(0);
    expect(rootIdx).toBeGreaterThan(importIdx);
    expect(styles.slice(0, rootIdx)).not.toMatch(/^\s*[^{@/][^{]*\{/m);
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
      require: ["--surface-popover-bg", "--surface-popover-fg"],
      forbid: ["backdrop-filter"],
    });
    assertGuardedRule("site/css/device-shell.css", ".device-inbox-sheet", {
      require: ["--surface-popover-bg", "--surface-popover-fg"],
      forbid: ["backdrop-filter"],
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
      require: ["--hc-emphasis-card-shadow", "border: none"],
      forbid: ["--hc-emphasis-card-border", "rgba(10, 132, 255, 0.44)"],
    });
    assertGuardedRule("site/css/hc-emphasis-card.css", ".hc-emphasis-card--active", {
      require: ["--hc-emphasis-card-fill-active"],
      forbid: ["rgba(10, 132, 255, 0.1)"],
    });
    assertGuardedRule(
      "site/css/hc-emphasis-card.css",
      ".hc-emphasis-card__title,\n.wallet-active-label",
      {
        require: ["--hc-emphasis-card-title-fg"],
        forbid: ["color: var(--black)"],
      }
    );
    assertGuardedRule("site/css/theme-dark.css", "html[data-theme=\"dark\"] .hc-emphasis-card--active", {
      require: ["--hc-emphasis-card-fill-active"],
    });
    assertGuardedRule("site/css/theme-dark.css", "html[data-theme=\"dark\"] .hc-emphasis-card--urgent", {
      require: ["--hc-emphasis-card-fill-urgent"],
    });
    expect(readSiteCss("site/styles.css")).not.toContain(".live-control-notification-inner");
    assertGuardedRule("site/css/theme-dark.css", "a.wallet-chrome-home", {
      require: ["color: var(--red)", "--shell-fill"],
    });
  });
});
