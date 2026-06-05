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
    expect(wallet).toMatch(
      /hc-emphasis-card__actions[\s\S]*hc-notice-foot/
    );
    expect(wallet).not.toContain("hc-notice-ack");
    const ackIdx = wallet.indexOf("data-keys-custody-ack");
    const footIdx = wallet.indexOf("hc-notice-foot");
    expect(ackIdx).toBeGreaterThan(-1);
    expect(footIdx).toBeGreaterThan(ackIdx);
  });

  it("created variant stays warn emphasis card", () => {
    const html = keysCustodyHtml("created");
    expect(html).toContain("hc-emphasis-card--warn");
    expect(html).toContain("device-keys-custody--created");
    expect(html).toContain("device-keys-custody-dl");
    expect(html).toContain("Save ownership on this device");
    expect(html).toContain("object QRs");
  });

  it("compact variant uses warn emphasis card without legacy notice", () => {
    const html = keysCustodyHtml("compact");
    expect(html).toContain("hc-emphasis-card--warn");
    expect(html).toContain("device-keys-custody--compact");
    expect(html).not.toContain("hc-notice--warning");
  });

  it("wallet page uses My objects nav label (D3)", () => {
    const html = readFileSync(join(root, "site/wallet/index.html"), "utf8");
    expect(html).toContain("My objects on this device");
    expect(html).not.toContain("My cards on this device");
  });

  it("help page leads with ownership and demotes signing keys to advanced", () => {
    const html = readFileSync(join(root, "site/help/index.html"), "utf8");
    expect(html).toContain('id="ownership"');
    expect(html).toContain("Ownership &amp; control");
    expect(html).toContain('id="advanced"');
    expect(html).toContain("Advanced · for developers");
    expect(html).toContain("Signing keys &amp; storage");
    expect(html).not.toContain("Keys &amp; custody");
    expect(html).toContain('id="restore-on-another-device"');
    expect(html).toContain('id="lose-access"');
    expect(html).toContain("Recovery code");
    expect(html).toContain("scan link or profile ID");
    expect(html).toContain("global lookup by handle");
    expect(html).toContain('id="restore-from-scan"');
    expect(html).toContain("Restore control");
  });

  it("landing uses ownership trust chip not keys in browser", () => {
    const html = readFileSync(join(root, "site/index.html"), "utf8");
    expect(html).toContain("Control on your device");
    expect(html).not.toContain("Keys in your browser");
    expect(html).toContain("How saved controls work");
    expect(html).toContain("Saved controls");
    expect(html).not.toContain("Revoke &amp; manage");
  });

  it("card creation demotes keys-custody disclosure for developers", () => {
    const html = readFileSync(join(root, "site/features/card-creation.html"), "utf8");
    expect(html).toMatch(/Advanced: signing keys (&amp;|&) browser storage/);
    expect(html).toContain("Save ownership on this device");
    expect(html).not.toContain("Where keys live (critical)");
  });

  it("created setup page exposes custody mount slot", () => {
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain('id="device-keys-custody-created-setup"');
    expect(html).toContain('id="created-setup-keys-mount"');
    expect(html).toContain("Save ownership on this device");
    expect(html).toContain("Save control on this device");
    expect(html).toContain("item and its codes");
    expect(html).toContain("restores control of this item");
    expect(html).toContain("Restore ownership");
  });

  it("backup and recovery scripts explain root object control", () => {
    const backup = readFileSync(join(root, "site/js/key-backup-ui.mjs"), "utf8");
    const recovery = readFileSync(join(root, "site/js/recovery-key-ui.mjs"), "utf8");
    expect(backup).toContain("root-card backup restores control");
    expect(backup).toContain("Ownership restored for this card");
    expect(recovery).toContain("restore root-card control");
    expect(recovery).toContain("Root-card controls are available below");
  });

  it("status plate pilot exposes habit loop scorecard on created", () => {
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain('id="status-plate-loop-scorecard"');
    expect(html).toContain('id="status-plate-loop-progress"');
    expect(html).toContain('id="status-plate-loop-export"');
    expect(html).toContain("Copy pilot summary");
    expect(html).toContain("No scan analytics");
  });

  it("lost item relay pilot exposes habit loop scorecard on created", () => {
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain('id="lost-item-loop-scorecard"');
    expect(html).toContain('id="lost-item-loop-export"');
    expect(html).toContain("Printed QR and tagged the item");
  });

  it("created Settings tab groups saved-item controls with plain intro (IA)", () => {
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain("Manage this saved item");
    expect(html).toContain("created-manage-group-label");
    expect(html).toContain("Access &amp; recovery");
    expect(html).toContain("Share &amp; preview");
    expect(html).toContain("Issue new code");
    expect(html).toContain("Preview item");
    expect(html).not.toContain("Issue new QR");
    expect(html).toContain('id="created-manage-more"');
    expect(html).toContain("More settings");
    expect(html).toContain('id="created-managing-context"');
    expect(html).toContain('id="child-object-add-hub"');
    const tabsIdx = html.indexOf('role="tablist"');
    const addHubIdx = html.indexOf('id="child-object-add-hub"');
    const primarySegmentIdx = html.indexOf('aria-label="Control room"');
    expect(tabsIdx).toBeGreaterThan(-1);
    expect(addHubIdx).toBeGreaterThan(tabsIdx);
    expect(primarySegmentIdx).toBe(-1);
    expect(html).toContain('aria-label="Add options filter"');
  });

  it("created Manage tab collapses developer export under Export for developers (D8)", () => {
    const html = readFileSync(join(root, "site/created/index.html"), "utf8");
    expect(html).toContain('id="created-developer-export-details"');
    expect(html).toContain("Export for developers");
    expect(html).toContain('id="owner-pubkey-preview-block"');
    expect(html).toContain('id="owner-pubkey-display"');
    expect(html).not.toContain("Unlock root controls");
    expect(html).toContain("Recovery code");
    const restoreToolsIdx = html.indexOf('id="created-view-restore-tools"');
    const devIdx = html.indexOf("created-developer-export-details");
    const exportBlockIdx = html.indexOf('id="backup-export-block"');
    const importRecoveryIdx = html.indexOf('id="import-recovery-form"');
    expect(restoreToolsIdx).toBeGreaterThan(-1);
    expect(devIdx).toBeGreaterThan(-1);
    expect(exportBlockIdx).toBeGreaterThan(devIdx);
    expect(importRecoveryIdx).toBeGreaterThan(restoreToolsIdx);
    expect(importRecoveryIdx).toBeLessThan(devIdx);
    const backupPanelIdx = html.indexOf('id="backup-details"');
    expect(backupPanelIdx).toBeGreaterThan(-1);
    expect(backupPanelIdx).toBeGreaterThan(importRecoveryIdx);
    expect(backupPanelIdx).toBeLessThan(devIdx);
    expect(html.indexOf('id="import-backup-form"')).toBeGreaterThan(backupPanelIdx);
    expect(html.indexOf('id="import-backup-form"')).toBeLessThan(devIdx);
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
