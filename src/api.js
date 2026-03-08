import { config } from './config.js';

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${response.status}: ${message || 'Request failed'}`);
  }
  return response.json();
}

export async function loginWithPin(username, pin) {
  const body = new URLSearchParams({
    grant_type: 'password',
    username,
    password: pin,
    client_id: config.clientId,
    scope: config.scope,
  }).toString();

  return requestJson(`${config.authBaseUrl}${config.tokenPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
  }).toString();

  return requestJson(`${config.authBaseUrl}${config.tokenPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

export async function fetchQrCode(accessToken) {
  return requestJson(`${config.apiBaseUrl}${config.qrPath}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function fetchProfile(accessToken) {
  for (const path of config.profilePaths) {
    try {
      const result = await requestJson(`${config.apiBaseUrl}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (result?.firstName || result?.name || result?.username || result?.memberName) {
        return result;
      }
    } catch {
      // Try next endpoint
    }
  }
  return null;
}
