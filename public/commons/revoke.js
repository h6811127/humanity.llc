const API_BASE = `${window.location.origin}/.well-known/hc/v0.5`;

const form = document.getElementById('revoke-form');
const errEl = document.getElementById('revoke-error');
const okEl = document.getElementById('revoke-success');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');
  errEl.textContent = '';
  okEl.textContent = '';

  const profile_id = document.getElementById('profile_id').value.trim();
  const revocation_secret = document.getElementById('revocation_secret').value.trim();

  try {
    const res = await fetch(`${API_BASE}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ profile_id, revocation_secret }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      errEl.textContent =
        data.message ||
        (res.status === 401
          ? 'Revocation failed. Check your secret and try again.'
          : 'Request failed.');
      errEl.classList.remove('hidden');
      return;
    }

    okEl.textContent = data.message || 'Profile revoked.';
    okEl.classList.remove('hidden');
    form.reset();
  } catch {
    errEl.textContent = 'Unable to reach the resolver. Check your internet connection.';
    errEl.classList.remove('hidden');
  }
});
