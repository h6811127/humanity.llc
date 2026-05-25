/**
 * Landing device hub init.
 */
import { initAutoSaveToggle } from "./device-auto-save.mjs";
import { initDeviceHub } from "./device-hub-ui.mjs";

initDeviceHub({ noticeMode: "created-url" });
initAutoSaveToggle();
