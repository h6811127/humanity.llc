/**
 * /created/ device hub init.
 */
import { initDeviceHub } from "./device-hub-ui.mjs";

initDeviceHub({
  noticeMode: "keys-strip",
  showLiveControlInbox: false,
  showActivity: false,
  showImport: false,
  savedLabel: "My cards",
});

const compactHiddenIds = [
  "device-hub-pins-group",
  "device-hub-actions-section",
  "device-hub-shortcuts-group",
];

for (const id of compactHiddenIds) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

document.getElementById("created-hub-manage-tab")?.addEventListener("click", () => {
  document.getElementById("created-tab-btn-manage")?.click();
  document.getElementById("created-tab-manage")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
