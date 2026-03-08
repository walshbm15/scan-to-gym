import { AuthController } from './auth.js';
import { QrController } from './qr.js';
import { clearAuthData } from './storage.js';

const els = {
  loginView: document.getElementById('login-view'),
  qrView: document.getElementById('qr-view'),
  usernameInput: document.getElementById('username'),
  pinInput: document.getElementById('pin'),
  loginBtn: document.getElementById('login-btn'),
  loginError: document.getElementById('login-error'),
  qrContainer: document.getElementById('qr-container'),
  qrExpiry: document.getElementById('qr-expiry'),
  qrRefreshing: document.getElementById('qr-refreshing'),
  qrError: document.getElementById('qr-error'),
  manualRefreshBtn: document.getElementById('manual-refresh-btn'),
  userMenu: document.getElementById('user-menu'),
  userMenuToggle: document.getElementById('user-menu-toggle'),
  userMenuName: document.getElementById('user-menu-name'),
  userMenuContent: document.getElementById('user-menu-content'),
  logoutBtn: document.getElementById('logout-btn'),
};

const auth = new AuthController({
  onError: () => forceLogout(),
});

const qr = new QrController({
  onState: renderQr,
  onError: (error) => showError(els.qrError, `Could not refresh QR: ${error.message}`),
});

function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
}

function hideError(element) {
  element.textContent = '';
  element.classList.add('hidden');
}

function setLoggedIn(isLoggedIn) {
  els.loginView.classList.toggle('hidden', isLoggedIn);
  els.qrView.classList.toggle('hidden', !isLoggedIn);
  els.userMenu.classList.toggle('hidden', !isLoggedIn);
  els.userMenuToggle.classList.toggle('hidden', !isLoggedIn);
}

function renderQr(state) {
  const qrPayload = state?.qrCode || state?.qrcode || state?.code || state?.value || '';
  if (qrPayload) {
    els.qrContainer.innerHTML = '';
    if (String(qrPayload).startsWith('data:image')) {
      const img = document.createElement('img');
      img.src = qrPayload;
      img.alt = 'Gym entry QR code';
      img.className = 'qr-image';
      els.qrContainer.appendChild(img);
    } else {
      const pre = document.createElement('pre');
      pre.className = 'qr-fallback';
      pre.textContent = qrPayload;
      els.qrContainer.appendChild(pre);
    }
  }

  if (state?.expires_at) {
    els.qrExpiry.textContent = new Date(state.expires_at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  els.qrRefreshing.classList.toggle('hidden', !state?.refreshing);
}

function loadUserName() {
  els.userMenuName.textContent = auth.getAuth()?.username || els.usernameInput.value || 'Member';
}

async function bootstrapLoggedIn() {
  setLoggedIn(true);
  loadUserName();
  auth.scheduleRefresh();

  const existingQr = qr.getState();
  if (existingQr) {
    renderQr(existingQr);
    qr.schedule(auth.getAuth().access_token);
  } else {
    await qr.refresh(auth.getAuth().access_token, { background: true });
  }
}

function forceLogout() {
  auth.clearTimer();
  qr.clearTimer();
  clearAuthData();
  setLoggedIn(false);
  els.qrContainer.innerHTML = '';
  hideError(els.qrError);
}

els.loginBtn.addEventListener('click', async () => {
  hideError(els.loginError);
  const username = els.usernameInput.value.trim();
  const pin = els.pinInput.value.trim();

  if (!username || !pin) {
    showError(els.loginError, 'Username and PIN are required');
    return;
  }

  els.loginBtn.disabled = true;
  try {
    await auth.login(username, pin);
    await bootstrapLoggedIn();
  } catch (error) {
    showError(els.loginError, `Login failed: ${error.message}`);
  } finally {
    els.loginBtn.disabled = false;
  }
});

els.manualRefreshBtn.addEventListener('click', async () => {
  hideError(els.qrError);
  try {
    await qr.refresh(auth.getAuth().access_token, { background: true });
  } catch {
    // handled in controller callback
  }
});

els.userMenuToggle.addEventListener('click', () => {
  els.userMenuContent.classList.toggle('hidden');
});

els.userMenuName.addEventListener('click', () => {
  els.userMenuContent.classList.toggle('hidden');
});

els.logoutBtn.addEventListener('click', () => {
  forceLogout();
});

if (auth.isLoggedIn()) {
  bootstrapLoggedIn().catch(() => forceLogout());
} else {
  setLoggedIn(false);
}
