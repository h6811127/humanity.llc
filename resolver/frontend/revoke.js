/**
 * Tech Spec v0.5 §4.6 revoke UI + §8.1 user-facing messages.
 */
const API_BASE = `${window.location.origin}/.well-known/hc/v0.5`;

const form = document.getElementById('revoke-form');
const formError = document.getElementById('form-error');
const formSuccess = document.getElementById('form-success');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('hidden');
  formSuccess.classList.add('hidden');
  formError.textContent = '';
  formSuccess.textContent = '';

  const profile_id = document.getElementById('profile_id').value.trim();
  const revocation_secret = document.getElementById('revocation_secret').value.trim();

  submitBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ profile_id, revocation_secret }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      let msg = data.message || 'Revocation failed. Check your secret and try again.';
      if (res.status === 404) {
        msg = 'No profile exists with this ID. The QR code may be invalid or revoked.';
      }
      formError.textContent = msg;
      formError.classList.remove('hidden');
      return;
    }

    formSuccess.textContent = data.message || 'Profile revoked.';
    formSuccess.classList.remove('hidden');
    form.reset();
  } catch {
    formError.textContent =
      'Unable to reach the resolver. Please check your internet connection.';
    formError.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
  }
});
