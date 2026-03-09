import { storageKeys } from './config.js';
import { saveJSON, readJSON } from './storage.js';
import { toEpochMs, clampDelay } from './time.js';
import { loginWithPin, refreshAccessToken } from './api.js';

export class AuthController {
  constructor({
    now = () => Date.now(),
    setTimeoutFn = (cb, delay) => globalThis.setTimeout(cb, delay),
    clearTimeoutFn = (id) => globalThis.clearTimeout(id),
    onAuthChange = () => {},
    onError = () => {},
  } = {}) {
    this.now = now;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.onAuthChange = onAuthChange;
    this.onError = onError;
    this.refreshTimer = null;
    this.auth = readJSON(storageKeys.auth);
  }

  getAuth() {
    return this.auth;
  }

  isLoggedIn() {
    return Boolean(this.auth?.access_token && this.auth?.expires_at > this.now());
  }

  async login(username, pin) {
    // Step 1: exchange username+pin for tokens.
    const tokenData = await loginWithPin(username, pin);
    // Step 2: persist computed auth state (including absolute expiry).
    this.auth = this.persistTokenResponse({ ...tokenData, member_pin: pin });

    // Step 3: arm proactive refresh and notify UI.
    this.scheduleRefresh();
    this.onAuthChange(this.auth);
    return this.auth;
  }

  async refresh() {
    if (!this.auth?.refresh_token) {
      throw new Error('No refresh token available');
    }
    // Refresh token exchange keeps the old refresh token if API omits a new one.
    const tokenData = await refreshAccessToken(this.auth.refresh_token);
    this.auth = this.persistTokenResponse({
      ...tokenData,
      refresh_token: tokenData.refresh_token || this.auth.refresh_token,
      member_pin: tokenData.member_pin || this.auth.member_pin,
    });
    this.scheduleRefresh();
    this.onAuthChange(this.auth);
    return this.auth;
  }

  persistTokenResponse(tokenData) {
    const expires_at = toEpochMs(tokenData.expires_in, this.now());
    const authState = { ...tokenData, expires_at };
    saveJSON(storageKeys.auth, authState);
    return authState;
  }

  scheduleRefresh() {
    if (!this.auth?.expires_at) return;
    if (this.refreshTimer) this.clearTimeoutFn(this.refreshTimer);

    // Refresh 5 minutes early so UI is unlikely to hit an expired access token.
    const refreshAt = this.auth.expires_at - 5 * 60 * 1000;
    const delay = clampDelay(refreshAt - this.now());

    this.refreshTimer = this.setTimeoutFn(async () => {
      try {
        await this.refresh();
      } catch (error) {
        this.onError(error);
      }
    }, delay);
  }

  clearTimer() {
    if (this.refreshTimer) this.clearTimeoutFn(this.refreshTimer);
    this.refreshTimer = null;
  }
}
