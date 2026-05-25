/**
 * /created/ device hub init.
 */
import { initDeviceHub } from "./device-hub-ui.mjs";

initDeviceHub({ noticeMode: "keys-strip", showLiveControlInbox: false });

document.getElementById("created-hub-manage-tab")?.addEventListener("click", () => {
  document.getElementById("created-tab-btn-manage")?.click();
  document.getElementById("created-tab-manage")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
