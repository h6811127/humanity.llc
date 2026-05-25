/**
 * Task dashboard primary actions on /created/.
 */

/**
 * @param {{ selectTab: (id: string) => void }} opts
 */
export function initCreatedDashboard({ selectTab }) {
  const keysStrip = document.getElementById("created-keys-strip");
  const qrSection = document.getElementById("created-qr-section");
  const downloadBtn = document.getElementById("download-qr");
  const openScan = document.getElementById("open-scan");
  const manifestoPanel = document.getElementById("manifesto-update-panel");
  const revokeDetails = document.getElementById("revoke-details");
  const printTip = document.querySelector("#created-qr-section .created-print-tip");

  const actions = {
    "save-keys": () => {
      selectTab("now");
      keysStrip?.removeAttribute("hidden");
      keysStrip?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      document.getElementById("created-device-save-label")?.focus({ preventScroll: true });
    },
    "download-qr": () => {
      selectTab("now");
      qrSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (downloadBtn && !downloadBtn.disabled) downloadBtn.click();
    },
    "print-qr": () => {
      selectTab("now");
      qrSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      printTip?.setAttribute("open", "");
    },
    "test-scan": () => {
      selectTab("now");
      if (openScan && !openScan.hidden) {
        openScan.click();
      } else {
        qrSection?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    "update-status": () => {
      selectTab("manage");
      manifestoPanel?.removeAttribute("hidden");
      manifestoPanel?.setAttribute("open", "");
      manifestoPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    "revoke-qr": () => {
      selectTab("manage");
      revokeDetails?.setAttribute("open", "");
      revokeDetails?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
  };

  document.querySelectorAll("[data-created-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-created-action");
      if (id && actions[id]) actions[id]();
    });
  });
}
