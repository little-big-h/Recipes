import { PASSWORD_HASH } from './config.js';

const UNLOCK_KEY = 'recipes-unlocked';

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isUnlocked() {
  return localStorage.getItem(UNLOCK_KEY) === '1';
}

export function mountLockScreen(root, onUnlock) {
  root.innerHTML = `
    <div class="lock-screen">
      <div class="lock-card">
        <div class="lock-icon" aria-hidden="true">
          <img src="icons/icon-192.png" alt="" width="72" height="72">
        </div>
        <h1>Family Recipes</h1>
        <p class="lock-hint">Enter the password to continue.</p>
        <form id="lock-form" autocomplete="off">
          <input
            id="lock-password"
            type="password"
            inputmode="text"
            placeholder="Password"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            required
          >
          <button type="submit">Unlock</button>
        </form>
        <p class="lock-error" id="lock-error" hidden>Wrong password — try again.</p>
      </div>
    </div>
  `;

  const form = root.querySelector('#lock-form');
  const input = root.querySelector('#lock-password');
  const error = root.querySelector('#lock-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hash = await sha256Hex(input.value);
    if (hash === PASSWORD_HASH) {
      localStorage.setItem(UNLOCK_KEY, '1');
      onUnlock();
    } else {
      error.hidden = false;
      input.value = '';
      input.focus();
      root.querySelector('.lock-card').classList.remove('shake');
      // eslint-disable-next-line no-void
      void root.querySelector('.lock-card').offsetWidth;
      root.querySelector('.lock-card').classList.add('shake');
    }
  });

  input.focus();
}
