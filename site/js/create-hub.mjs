/**
 * /create/ device hub init.
 */
import { initDeviceHub } from "./device-hub-ui.mjs";
import { initPwaInstallPrompt } from "./pwa-install.mjs";
import "./device-help-fab.mjs";

// DEVICE_OS: keep live-proof inbox on landing + /wallet only; /created signs in-panel.
initDeviceHub({ noticeMode: "created-url", showLiveControlInbox: false });
initPwaInstallPrompt();
