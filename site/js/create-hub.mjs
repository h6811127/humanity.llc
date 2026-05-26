/**
 * /create/ device hub init.
 */
import { initDeviceHub } from "./device-hub-ui.mjs";

// DEVICE_OS: keep live-proof inbox on landing + /wallet only; /created signs in-panel.
initDeviceHub({ noticeMode: "created-url", showLiveControlInbox: false });
