import QRCode from 'qrcode';
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
let qrRenderVersion = 0;

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
  // Endpoint payload formats vary (token string, image data URL, svg, etc.).
  const qrPayload = getQrPayload(state);
  if (qrPayload) {
    els.qrContainer.innerHTML = '';
    const renderVersion = ++qrRenderVersion;
    if (String(qrPayload).startsWith('data:image')) {
      const img = document.createElement('img');
      img.src = qrPayload;
      img.alt = 'Gym entry QR code';
      img.className = 'qr-image';
      els.qrContainer.appendChild(img);
    } else if (String(qrPayload).trim().startsWith('<svg')) {
      const svg = document.createElement('div');
      svg.className = 'qr-fallback';
      svg.innerHTML = String(qrPayload);
      els.qrContainer.appendChild(svg);
    } else if (looksLikeBase64(qrPayload)) {
      const img = document.createElement('img');
      img.src = `data:image/png;base64,${qrPayload}`;
      img.alt = 'Gym entry QR code';
      img.className = 'qr-image';
      els.qrContainer.appendChild(img);
    } else {
      renderGeneratedQr(els.qrContainer, qrPayload, renderVersion);
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

function getQrPayload(state) {
  if (!state || typeof state !== 'object') return '';
  const directCandidates = [
    state.QrCode,
    state.qrCode,
    state.qrcode,
    state.qr_code,
    state.QRCode,
    state.code,
    state.value,
    state.payload,
    state.data,
    state.image,
    state.imageData,
    state.qrImage,
    state.qrSvg,
    state.svg,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  const nestedCandidates = [state.qr, state.Qr, state.qrCodeData, state.result, state.Result, state.memberQrCode];
  for (const node of nestedCandidates) {
    if (node && typeof node === 'object') {
      const nested = getQrPayload(node);
      if (nested) return nested;
    } else if (typeof node === 'string' && node.trim()) {
      return node;
    }
  }
  return '';
}

function looksLikeBase64(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('http://') || raw.startsWith('https://') || raw.includes('<svg')) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(raw) && raw.length > 100;
}

function renderGeneratedQr(container, payload, renderVersion) {
  // Convert check-in token text (e.g. "exerp:checkin:...") into an actual QR image.
  QRCode.toDataURL(String(payload), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 300,
  }).then((dataUrl) => {
    if (renderVersion !== qrRenderVersion) return;
    container.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Gym entry QR code';
    img.className = 'qr-image';
    container.appendChild(img);
  }).catch(() => {
    if (renderVersion !== qrRenderVersion) return;
    container.innerHTML = '';
    const pre = document.createElement('pre');
    pre.className = 'qr-fallback';
    pre.textContent = payload;
    container.appendChild(pre);
  });
}

function loadUserName() {
  // Member name can come from token response username, or fallback to typed input.
  els.userMenuName.textContent = auth.getAuth()?.username || els.usernameInput.value || 'Member';
}

async function bootstrapLoggedIn({ autoRefreshQr = true } = {}) {
  // Enter authenticated view immediately after token success.
  setLoggedIn(true);
  loadUserName();
  auth.scheduleRefresh();

  const existingQr = qr.getState();
  if (existingQr) {
    // Rehydrate cached QR and resume background refresh timer.
    renderQr(existingQr);
    qr.schedule(auth.getAuth().access_token);
  } else if (autoRefreshQr) {
    // First QR fetch right after login when no cached QR is available.
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
    console.error('Login failed', error);
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
