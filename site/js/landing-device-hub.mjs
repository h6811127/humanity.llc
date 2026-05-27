/**
 * Landing device hub init.
 */
import { initAutoSaveToggle } from "./device-auto-save.mjs";
import { initResolverSyncTabsToggle } from "./device-resolver-sync-prefs.mjs";
import { initDeviceHub } from "./device-hub-ui.mjs";
import { mountBrowserNotifToggles } from "./device-browser-notifications.mjs";
import { mountThemeToggles } from "./device-theme.mjs";
import "./device-help-fab.mjs";

initDeviceHub({ noticeMode: "created-url", showLiveControlInbox: true });
initAutoSaveToggle();
initResolverSyncTabsToggle();
mountThemeToggles();
mountBrowserNotifToggles();
