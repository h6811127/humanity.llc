/**
 * Optional credential-code verifier (SCANNER_EXPERIENCE Phase F).
 */

import {
  CREDENTIAL_CODE_PATTERN,
  credentialCodeFromScanUrl,
  credentialCodeMatches,
} from "./qr-credential-code.mjs";

const form = document.getElementById("verify-form");
const scanUrlInput = document.getElementById("verify-scan-url");
const codeInput = document.getElementById("verify-code");
const resultPanel = document.getElementById("verify-result");
const resultLead = document.getElementById("verify-result-lead");
const facts = document.getElementById("verify-facts");

function resolverBase() {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return "http://127.0.0.1:8787";
  }
  return "https://humanity.llc";
}

/**
 * @param {string} scanUrl
 */
function idsFromScanUrl(scanUrl) {
  try {
    const url = new URL(scanUrl.trim());
    const match = url.pathname.match(/^\/c\/([^/]+)\/?$/);
    if (!match) return null;
    const profileId = decodeURIComponent(match[1]);
    const qrId = url.searchParams.get("q");
    if (!qrId) return null;
    return { profileId, qrId };
  } catch {
    return null;
  }
}

/**
 * @param {string} label
 * @param {string} value
 */
function addFact(label, value) {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  facts.appendChild(dt);
  facts.appendChild(dd);
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultPanel.hidden = true;
  facts.replaceChildren();

  const scanUrl = scanUrlInput?.value?.trim() ?? "";
  const code = codeInput?.value?.trim().toUpperCase() ?? "";

  if (!scanUrl) {
    resultLead.textContent = "Enter the scan URL from the QR or the Show link section.";
    resultPanel.hidden = false;
    return;
  }

  if (!CREDENTIAL_CODE_PATTERN.test(code)) {
    resultLead.textContent = "Enter the HC-XXXX-XXXX code printed under the QR.";
    resultPanel.hidden = false;
    return;
  }

  const ids = idsFromScanUrl(scanUrl);
  if (!ids) {
    resultLead.textContent = "Scan URL must be https://humanity.llc/c/{profile_id}?q={qr_id}.";
    resultPanel.hidden = false;
    return;
  }

  const expectedFromUrl = credentialCodeFromScanUrl(scanUrl);
  const statusUrl = `${resolverBase()}/.well-known/hc/v1/cards/${encodeURIComponent(ids.profileId)}/status?q=${encodeURIComponent(ids.qrId)}`;

  try {
    const res = await fetch(statusUrl, { headers: { Accept: "application/json" } });
    const body = await res.json();
    const networkCode =
      body?.scan?.qr?.credential_code ?? body?.scan?.credential_code ?? null;
    const matchesPrint = credentialCodeMatches(code, ids.profileId, ids.qrId);
    const matchesNetwork =
      networkCode && code === String(networkCode).trim().toUpperCase();

    if (matchesPrint && matchesNetwork) {
      resultLead.textContent =
        "Match — the printed code matches this object on the network.";
    } else if (matchesPrint && !networkCode) {
      resultLead.textContent =
        "Printed code matches this URL, but status JSON did not include credential_code (update resolver).";
    } else {
      resultLead.textContent =
        "Mismatch — do not trust this sticker. The code does not match network status.";
    }

    addFact("Your code", code);
    addFact("Expected from URL", expectedFromUrl ?? "—");
    addFact("Network credential_code", networkCode ?? "—");
    addFact("Scan kind", body?.scan?.kind ?? "—");
    if (body?.scan?.card?.handle) {
      addFact("Steward", `@${body.scan.card.handle}`);
    }
    resultPanel.hidden = false;
  } catch {
    resultLead.textContent =
      "Could not reach the resolver. For local dev, run the Worker at http://127.0.0.1:8787.";
    resultPanel.hidden = false;
  }
});
