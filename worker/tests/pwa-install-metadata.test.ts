import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PWA_APPLE_TOUCH_ICON_PATH,
  PWA_INSTALL_DOC,
  PWA_MANIFEST_PATH,
  PWA_REQUIRED_ICON_SIZES,
  PWA_SHELL_HTML_PATHS,
  isPwaExcludedPath,
  isPwaShellPagePath,
  manifestHasRequiredIconSizes,
  validatePwaManifestShape,
} from "../../site/js/pwa-install-metadata-core.mjs";
import { buildScanViewModel } from "../src/resolver/scan-state";
import { renderScanPage } from "../src/resolver/scan-html";

const root = path.join(fileURLToPath(new URL("../..", import.meta.url)));

describe("pwa-install-metadata-core", () => {
  it("documents canonical spec path", () => {
    expect(PWA_INSTALL_DOC).toBe("docs/PWA_INSTALL.md");
    expect(fs.existsSync(path.join(root, "docs/PWA_INSTALL.md"))).toBe(true);
  });

  it("classifies shell vs excluded paths", () => {
    expect(isPwaShellPagePath("/")).toBe(true);
    expect(isPwaShellPagePath("/wallet/")).toBe(true);
    expect(isPwaShellPagePath("/created/")).toBe(true);
    expect(isPwaShellPagePath("/c/abc")).toBe(false);
    expect(isPwaShellPagePath("/create/")).toBe(false);
    expect(isPwaExcludedPath("/c/abc")).toBe(true);
    expect(isPwaExcludedPath("/create/")).toBe(true);
  });

  it("validates manifest shape", () => {
    const ok = validatePwaManifestShape({
      name: "humanity.llc",
      short_name: "humanity",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      icons: [{ src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" }],
    });
    expect(ok.ok).toBe(true);

    const bad = validatePwaManifestShape({ name: "x" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.missing).toContain("icons");
    }
  });

  it("requires 192 and 512 icon sizes when manifest ships", () => {
    expect(
      manifestHasRequiredIconSizes([
        { sizes: "192x192" },
        { sizes: "512x512" },
      ])
    ).toBe(true);
    expect(manifestHasRequiredIconSizes([{ sizes: "192x192" }])).toBe(false);
    expect(PWA_REQUIRED_ICON_SIZES).toEqual([192, 512]);
  });
});

describe("PWA metadata on disk (Phase 1 gate)", () => {
  it("manifest path constant matches planned deploy location", () => {
    expect(PWA_MANIFEST_PATH).toBe("/manifest.webmanifest");
  });

  it("manifest file exists with required fields after Phase 1", () => {
    const manifestPath = path.join(root, "site/manifest.webmanifest");
    if (!fs.existsSync(manifestPath)) {
      expect.soft(manifestPath).toMatch(/manifest\.webmanifest$/);
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const result = validatePwaManifestShape(manifest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(manifestHasRequiredIconSizes(manifest.icons)).toBe(true);
    }
  });

  it("shell HTML includes manifest link after Phase 1", () => {
    for (const rel of PWA_SHELL_HTML_PATHS) {
      const htmlPath = path.join(root, "site", rel.replace(/^\//, ""));
      const html = fs.readFileSync(htmlPath, "utf8");
      if (!fs.existsSync(path.join(root, "site/manifest.webmanifest"))) {
        expect(html).not.toContain('rel="manifest"');
        continue;
      }
      expect(html, rel).toContain('rel="manifest"');
      expect(html, rel).toContain(PWA_MANIFEST_PATH);
      expect(html, rel).toContain('rel="apple-touch-icon"');
      expect(html, rel).toContain(PWA_APPLE_TOUCH_ICON_PATH);
    }
  });

  it("icon PNGs exist on disk after Phase 1", () => {
    const manifestPath = path.join(root, "site/manifest.webmanifest");
    if (!fs.existsSync(manifestPath)) return;
    for (const size of PWA_REQUIRED_ICON_SIZES) {
      expect(fs.existsSync(path.join(root, `site/icons/pwa-${size}.png`))).toBe(true);
    }
    expect(fs.existsSync(path.join(root, "site/icons/pwa-apple-touch.png"))).toBe(true);
  });

  it("shell HTML includes install card placeholder after Phase 2", () => {
    for (const rel of PWA_SHELL_HTML_PATHS) {
      const htmlPath = path.join(root, "site", rel.replace(/^\//, ""));
      const html = fs.readFileSync(htmlPath, "utf8");
      expect(html, rel).toContain('id="device-pwa-install-card"');
    }
    const createHtml = fs.readFileSync(path.join(root, "site/create/index.html"), "utf8");
    expect(createHtml).not.toContain('id="device-pwa-install-card"');
  });

  it("status bootstrap lazy-loads pwa-install on shell pages only", () => {
    const bootstrap = fs.readFileSync(
      path.join(root, "site/js/device-status-bootstrap.mjs"),
      "utf8"
    );
    expect(bootstrap).toContain("isPwaShellPagePath");
    expect(bootstrap).toContain("pwa-install.mjs");
    expect(bootstrap).not.toContain('from "./pwa-install.mjs"');
  });

  it("create and scan HTML do not link manifest", async () => {
    const createHtml = fs.readFileSync(path.join(root, "site/create/index.html"), "utf8");
    expect(createHtml).not.toContain('rel="manifest"');

    const vm = buildScanViewModel(
      "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
      "qr_test",
      {
        card: {
          profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          public_key: "pk",
          handle: "test",
          handle_normalized: "test",
          manifesto_line: "line",
          status: "active",
          card_document_json: "{}",
          created_at: "2026-05-16T17:00:00Z",
          updated_at: "2026-05-16T17:00:00Z",
        },
        qr: {
          qr_id: "qr_test",
          profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          epoch: 1,
          scope: "card",
          print_artifact_id: null,
          resolver_hint: "https://humanity.llc",
          status: "active",
          payload: "https://humanity.llc/c/x?q=qr_test",
          issued_at: "2026-05-16T17:00:00Z",
          expires_at: "2027-05-16T17:00:00Z",
          credential_document_json: "{}",
          created_at: "2026-05-16T17:00:00Z",
          updated_at: "2026-05-16T17:00:00Z",
        },
        verification: {
          profile_id: "7Xk9mP2nQ4rT6vW8yZ1aB3cD5",
          state: "registered",
          level: 1,
          label: "Registered",
          method: "registered",
          vouch_count: 0,
          latest_accepted_vouch_at: null,
          credential_ids_json: "[]",
          summary_document_json: null,
          updated_at: "2026-05-16T17:00:00Z",
        },
        revocationDisplay: null,
      },
      "https://humanity.llc"
    );
    const scanHtml = await renderScanPage(vm, "https://humanity.llc");
    expect(scanHtml).not.toContain('rel="manifest"');
  });
});
