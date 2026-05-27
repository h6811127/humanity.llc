import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const SHELL_PAGES = [
  "site/index.html",
  "site/wallet/index.html",
  "site/create/index.html",
  "site/created/index.html",
  "site/organizer-revoke/index.html",
];

function readSiteFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function pngDimensions(relativePath: string): { width: number; height: number } {
  const bytes = readFileSync(join(root, relativePath));
  const signature = bytes.subarray(0, 8).toString("hex");
  expect(signature, relativePath).toBe("89504e470d0a1a0a");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

describe("PWA install metadata", () => {
  it("defines an installable web app manifest", () => {
    const manifest = JSON.parse(readSiteFile("site/app.webmanifest"));

    expect(manifest).toMatchObject({
      id: "/",
      name: "humanity.llc",
      short_name: "Humanity",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ffffff",
    });
    expect(manifest.display_override).toEqual(["standalone", "minimal-ui", "browser"]);
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/assets/pwa-icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/assets/pwa-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/assets/pwa-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        }),
      ])
    );
    expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual([
      "/wallet/",
      "/create/",
      "/help/",
    ]);
  });

  it("ships manifest and Apple icon assets at declared sizes", () => {
    for (const path of [
      "site/app.webmanifest",
      "site/assets/pwa-icon-192.png",
      "site/assets/pwa-icon-512.png",
      "site/assets/pwa-maskable-512.png",
      "site/assets/apple-touch-icon.png",
    ]) {
      expect(existsSync(join(root, path)), path).toBe(true);
    }

    expect(pngDimensions("site/assets/pwa-icon-192.png")).toEqual({ width: 192, height: 192 });
    expect(pngDimensions("site/assets/pwa-icon-512.png")).toEqual({ width: 512, height: 512 });
    expect(pngDimensions("site/assets/pwa-maskable-512.png")).toEqual({
      width: 512,
      height: 512,
    });
    expect(pngDimensions("site/assets/apple-touch-icon.png")).toEqual({
      width: 180,
      height: 180,
    });
  });

  it("links install metadata from shell entry pages", () => {
    for (const page of SHELL_PAGES) {
      const html = readSiteFile(page);
      expect(html, page).toContain('<link rel="manifest" href="/app.webmanifest" />');
      expect(html, page).toContain(
        '<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />'
      );
      expect(html, page).toContain('<meta name="mobile-web-app-capable" content="yes" />');
      expect(html, page).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
      expect(html, page).toContain('<meta name="apple-mobile-web-app-title" content="Humanity" />');
      expect(html, page).toContain(
        '<meta name="apple-mobile-web-app-status-bar-style" content="default" />'
      );
      expect(html, page).toContain('<meta name="theme-color" content="#ffffff" />');
    }
  });

  it("serves install assets with explicit Pages headers", () => {
    const headers = readSiteFile("site/_headers");

    expect(headers).toContain("/app.webmanifest\n  Content-Type: application/manifest+json");
    expect(headers).toContain("/assets/*.png\n  Cache-Control: public, max-age=31536000, immutable");
    expect(headers).toContain("/sw-live-proof.mjs\n  Cache-Control: no-cache");
  });
});
