import { config } from './config.js';

async function requestJson(url, options = {}) {
  // Shared fetch helper: fail fast with response text so UI gets actionable errors.
  const response = await fetch(url, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${response.status}: ${message || 'Request failed'}`);
  }
  return response.json();
}

export async function loginWithPin(email, pin) {
  // PureGym auth endpoint expects form-encoded credentials for password grant.
  const body = new URLSearchParams({
    grant_type: 'password',
    // API contract still uses "username" as the form key.
    username: email,
    password: pin,
    scope: config.tokenScope,
    client_id: config.tokenClientId,
  }).toString();

  return requestJson(`${config.authBaseUrl}${config.tokenPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

export async function refreshAccessToken(refreshToken) {
  // Refresh flow reuses the same token endpoint with grant_type=refresh_token.
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: config.tokenScope,
    client_id: config.tokenClientId,
  }).toString();

  return requestJson(`${config.authBaseUrl}${config.tokenPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

export async function fetchQrCode(accessToken) {
  // QR endpoint is a simple bearer-authenticated GET.
  return requestJson(`${config.apiBaseUrl}${config.qrPath}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
