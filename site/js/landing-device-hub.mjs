/**
 * Landing device hub init.
 */
import { initAutoSaveToggle } from "./device-auto-save.mjs";
import { initDeviceHub } from "./device-hub-ui.mjs";
import { mountBrowserNotifToggles } from "./device-browser-notifications.mjs";
import { mountThemeToggles } from "./device-theme.mjs";
import "./device-help-fab.mjs";

initDeviceHub({ noticeMode: "created-url", showLiveControlInbox: true });
initAutoSaveToggle();
mountThemeToggles();
mountBrowserNotifToggles();
