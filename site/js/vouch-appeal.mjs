import { resolverErrorMessage } from "./resolver-user-error-core.mjs";

const ENDPOINT = `${location.origin}/.well-known/hc/v1/vouch-appeals`;

const form = document.getElementById("vouch-appeal-form");
const caseEl = document.getElementById("appeal-case-id");
const profileEl = document.getElementById("appeal-profile-id");
const statementEl = document.getElementById("appeal-statement");
const contactEl = document.getElementById("appeal-contact");
const submitBtn = document.getElementById("appeal-submit");
const statusEl = document.getElementById("appeal-status");

function setStatus(text, isError = false) {
  if (!statusEl) return;
  statusEl.hidden = !text;
  statusEl.textContent = text;
  statusEl.className = isError ? "form-status error" : "form-status success";
}

async function submitAppeal(event) {
  event.preventDefault();
  const case_id = caseEl?.value?.trim();
  const profile_id = profileEl?.value?.trim();
  const statement = statementEl?.value?.trim();
  const contact_method = contactEl?.value?.trim();

  if (!case_id || !profile_id || !statement) {
    setStatus("Fill in case id, profile id, and your appeal statement.", true);
    return;
  }

  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  setStatus("Submitting…");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id,
        profile_id,
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
          fallback: "Appeal could not be submitted.",
        })
      );
    }

    const reference = body.reference_code ? ` Reference code: ${body.reference_code}.` : "";
    setStatus(
      `Appeal received.${reference} Stewards will review under published rules.`,
      false
    );
    form?.reset();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Appeal could not be submitted.", true);
  } finally {
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
  }
}

form?.addEventListener("submit", (event) => {
  void submitAppeal(event);
});
