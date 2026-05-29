/**
 * /created/ device hub init.
 */
import "./device-steward-billing-return-bootstrap.mjs";
import { initDeviceHub } from "./device-hub-ui.mjs";
import "./device-help-fab.mjs";

initDeviceHub({
  noticeMode: "keys-strip",
  showLiveControlInbox: false,
  savedLabel: "My objects",
});

document.getElementById("created-hub-manage-tab")?.addEventListener("click", () => {
  document.getElementById("created-tab-btn-advanced")?.click();
  document.getElementById("created-tab-advanced")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

window.addEventListener("hc-created-go-now-tab", () => {
  document.getElementById("created-tab-btn-now")?.click();
  window.setTimeout(() => {
    document.getElementById("created-keys-strip")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 80);
});
