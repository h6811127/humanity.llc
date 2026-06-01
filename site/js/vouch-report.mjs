import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

const ENDPOINT = `${location.origin}/.well-known/hc/v1/vouch-reports`;

const form = document.getElementById("vouch-report-form");
const kindEl = document.getElementById("report-kind");
const targetEl = document.getElementById("report-target");
const statementEl = document.getElementById("report-statement");
const contactEl = document.getElementById("report-contact");
const submitBtn = document.getElementById("report-submit");
const statusEl = document.getElementById("report-status");

function setStatus(text, isError = false) {
  if (!statusEl) return;
  statusEl.hidden = !text;
  statusEl.textContent = text;
  statusEl.className = isError ? "form-status error" : "form-status success";
}

async function submitReport(event) {
  event.preventDefault();
  const kind = kindEl?.value?.trim();
  const target = targetEl?.value?.trim();
  const statement = statementEl?.value?.trim();
  const contact_method = contactEl?.value?.trim();

  if (!kind || !target || !statement) {
    setStatus("Choose a report type and fill in target and details.", true);
    return;
  }

  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  setStatus("Submitting…");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        target,
        statement,
        contact_method: contact_method || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        resolverErrorMessage(body, {
          status: res.status,
          requestUrl: ENDPOINT,
          fallback: "Report could not be submitted.",
        })
      );
    }

    const reference = body.reference_code ? ` Reference code: ${body.reference_code}.` : "";
    setStatus(
      `Report received.${reference} Stewards review privately — this is not a court or identity check.`,
      false
    );
    form?.reset();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Report could not be submitted.", true);
  } finally {
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
  }
}

form?.addEventListener("submit", (event) => {
  void submitReport(event);
});
