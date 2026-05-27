import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isLikelyIosDevice,
  isStandaloneDisplay,
  pwaInstallPromptMode,
} from "../../site/js/pwa-install-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSiteFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("PWA install UX", () => {
  it("chooses the correct install prompt mode", () => {
    expect(
      pwaInstallPromptMode({
        standalone: false,
        dismissed: false,
        installed: false,
        promptAvailable: true,
        ios: false,
      })
    ).toBe("install");
    expect(
      pwaInstallPromptMode({
        standalone: false,
        dismissed: false,
        installed: false,
        promptAvailable: false,
        ios: true,
      })
    ).toBe("ios-instructions");
    expect(
      pwaInstallPromptMode({
        standalone: true,
        dismissed: false,
        installed: false,
        promptAvailable: true,
        ios: true,
      })
    ).toBe("hidden");
    expect(
      pwaInstallPromptMode({
        standalone: false,
        dismissed: true,
        installed: false,
        promptAvailable: true,
        ios: false,
      })
    ).toBe("hidden");
  });

  it("detects standalone and iOS display contexts", () => {
    expect(isStandaloneDisplay({ standaloneMedia: true, navigatorStandalone: false })).toBe(true);
    expect(isStandaloneDisplay({ standaloneMedia: false, navigatorStandalone: true })).toBe(true);
    expect(
      isLikelyIosDevice({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
      })
    ).toBe(true);
    expect(
      isLikelyIosDevice({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)",
        platform: "MacIntel",
        maxTouchPoints: 5,
      })
    ).toBe(true);
    expect(
      isLikelyIosDevice({
        userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
        platform: "Linux x86_64",
        maxTouchPoints: 0,
      })
    ).toBe(false);
  });

  it("mounts install UX from shell page entry modules only", () => {
    for (const file of [
      "site/js/landing-device-hub.mjs",
      "site/js/create-hub.mjs",
      "site/js/created-hub.mjs",
      "site/js/wallet-page.mjs",
    ]) {
      const src = readSiteFile(file);
      expect(src, file).toContain('from "./pwa-install.mjs"');
      expect(src, file).toContain("initPwaInstallPrompt();");
    }

    const installSrc = readSiteFile("site/js/pwa-install.mjs");
    expect(installSrc).toContain('from "./pwa-service-worker.mjs"');
    expect(installSrc).toContain("registerPwaServiceWorker");

    const statusModules = readSiteFile("site/js/device-status-shell-modules.mjs");
    expect(statusModules).not.toContain("pwa-install.mjs");
  });

  it("bumps page entry cache busts for install UX imports", () => {
    expect(readSiteFile("site/index.html")).toContain("/js/landing-device-hub.mjs?v=14");
    expect(readSiteFile("site/create/index.html")).toContain("/js/create-hub.mjs?v=2");
    expect(readSiteFile("site/created/index.html")).toContain("/js/created-hub.mjs?v=4");
    expect(readSiteFile("site/wallet/index.html")).toContain("/js/wallet-page.mjs?v=6");
  });

  it("ships compact install prompt styles", () => {
    const css = readSiteFile("site/css/device-shell.css");
    expect(css).toContain(".pwa-install-prompt-host");
    expect(css).toContain(".pwa-install-prompt-actions");
    expect(css).toContain(".pwa-install-prompt-dismiss");
  });

  it("uses the existing root service worker without cache-first behavior", () => {
    const pwaSw = readSiteFile("site/js/pwa-service-worker.mjs");
    expect(pwaSw).toContain('PWA_SW_SCRIPT_URL = "/sw-live-proof.mjs"');
    expect(pwaSw).toContain('navigator.serviceWorker.getRegistration("/")');
    expect(pwaSw).toContain("navigator.serviceWorker.register(PWA_SW_SCRIPT_URL");

    const liveProofSw = readSiteFile("site/js/device-browser-notifications-sw.mjs");
    expect(liveProofSw).toContain('from "./pwa-service-worker.mjs"');
    expect(liveProofSw).toContain("export const SW_SCRIPT_URL = PWA_SW_SCRIPT_URL");
    expect(liveProofSw).toContain("return registerPwaServiceWorker();");
    expect(liveProofSw).toContain("await teardownLiveProofServiceWorker();");
    expect(liveProofSw).not.toContain(".unregister()");

    const swScript = readSiteFile("site/sw-live-proof.mjs");
    expect(swScript).toContain('self.addEventListener("fetch"');
    expect(swScript).toContain("event.respondWith(fetch(event.request));");
    expect(swScript).not.toContain("caches.match(event.request)");
  });

  it("documents manual PWA install and standalone QA", () => {
    const qa = readSiteFile("docs/DEVICE_OS_QA.md");
    expect(qa).toContain("### P1-PWA · Home-screen install and standalone shell");
    expect(qa).toContain("iPhone Safari");
    expect(qa).toContain("Android Chrome");
    expect(qa).toContain("Prompt hides in standalone mode");
    expect(qa).toContain("Single root worker is `/sw-live-proof.mjs`");
    expect(qa).toContain("disabling browser alerts unregisters the PWA service worker");

    const plan = readSiteFile("docs/PWA_INSTALL.md");
    expect(plan).toContain("P1-PWA · Home-screen install and standalone shell");
    expect(plan).toContain("Marketing/docs pages and Worker-generated scan pages remain out of scope");
    expect(plan).toContain("Rollout gate before adding install metadata beyond shell pages");
  });
});
