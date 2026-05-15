import { ed25519 } from 'https://esm.sh/@noble/ed25519@2.0.0';
import bs58Module from 'https://esm.sh/bs58@6.0.0';
const bs58 = bs58Module.default ?? bs58Module;

const API_BASE = `${window.location.origin}/.well-known/hc/v0.5`;

const form = document.getElementById('create-form');
const manifesto = document.getElementById('manifesto');
const charCount = document.getElementById('char-count');
const keypairStatus = document.getElementById('keypair-status');
const keyWarning = document.getElementById('key-warning');
const formError = document.getElementById('form-error');
const result = document.getElementById('result');
const submitBtn = document.getElementById('submit-btn');

manifesto.addEventListener('input', () => {
  charCount.textContent = String(manifesto.value.length);
});

keyWarning.classList.remove('hidden');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('hidden');
  formError.textContent = '';

  const handle = document.getElementById('handle').value.trim();
  const manifesto_line = manifesto.value;

  submitBtn.disabled = true;
  try {
    const secretKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(secretKey);
    const publicKeyB58 = bs58.encode(publicKey);

    keypairStatus.classList.remove('hidden');

    try {
      localStorage.setItem('hc_ed25519_secret_b58', bs58.encode(secretKey));
    } catch {
      /* quota or private mode */
    }

    const res = await fetch(`${API_BASE}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ handle, manifesto_line, public_key: publicKeyB58 }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        data.message ||
        (data.error === 'handle_taken'
          ? 'This handle is already in use. Please choose another.'
          : 'Could not create profile. Check your inputs and try again.');
      formError.textContent = msg;
      formError.classList.remove('hidden');
      return;
    }

    form.classList.add('hidden');
    result.classList.remove('hidden');

    const qrImg = document.getElementById('qr-img');
    qrImg.src = data.qr_code_url;
    qrImg.alt = `QR for ${data.handle}`;

    const dl = document.getElementById('qr-download');
    dl.href = data.qr_code_url;

    document.getElementById('secret-value').textContent = data.revocation_secret;
    const profileLink = document.getElementById('profile-url');
    profileLink.href = data.profile_url;
    profileLink.textContent = data.profile_url;

    document.getElementById('copy-secret').onclick = async () => {
      try {
        await navigator.clipboard.writeText(data.revocation_secret);
      } catch {
        formError.textContent = 'Could not copy to clipboard.';
        formError.classList.remove('hidden');
      }
    };

    document.getElementById('download-secret').onclick = () => {
      const blob = new Blob(
        [
          `Humanity Commons — revocation secret\nprofile_id: ${data.profile_id}\nsecret: ${data.revocation_secret}\n`,
        ],
        { type: 'text/plain' }
      );
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `humanity-revocation-${data.profile_id}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
  } catch (err) {
    formError.textContent =
      'Unable to reach the resolver or generate keys. Check your connection and try again.';
    formError.classList.remove('hidden');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
});
