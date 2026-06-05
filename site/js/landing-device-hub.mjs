/**
 * Landing device hub init.
 */
import "./device-steward-billing-return-bootstrap.mjs";
import {
  applyDevicePrefsBootToDocument,
  markDevicePrefsBootReady,
} from "./device-prefs-boot.mjs";
import { initAutoSaveToggle } from "./device-auto-save.mjs";
import { initQuietTabRehydrateToggle } from "./device-quiet-tab-rehydrate-prefs.mjs";
import {
  initResolverRefreshAllTabsAction,
  initResolverSyncTabsToggle,
} from "./device-resolver-sync-prefs.mjs";
import { initDeviceHub } from "./device-hub-ui.mjs";
import { initBrowserTabOnlyShortcutsVisibility } from "./pwa-browser-tab-shortcuts.mjs";
import { mountThemeToggles } from "./device-theme.mjs";
import "./device-help-fab.mjs";
import "./landing-focus-settings.mjs";

markDevicePrefsBootReady();
applyDevicePrefsBootToDocument();

initBrowserTabOnlyShortcutsVisibility();
initDeviceHub({ noticeMode: "created-url", showLiveControlInbox: true });
initAutoSaveToggle();
initQuietTabRehydrateToggle();
initResolverSyncTabsToggle();
initResolverRefreshAllTabsAction();
mountThemeToggles();
