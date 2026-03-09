import { storageKeys } from './config.js';
import { saveJSON, readJSON } from './storage.js';
import { clampDelay, toEpochMs } from './time.js';
import { fetchQrCode } from './api.js';

export class QrController {
  constructor({
    now = () => Date.now(),
    setTimeoutFn = (cb, delay) => globalThis.setTimeout(cb, delay),
    clearTimeoutFn = (id) => globalThis.clearTimeout(id),
    onState = () => {},
    onError = () => {},
  } = {}) {
    this.now = now;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.onState = onState;
    this.onError = onError;
    this.timer = null;
    this.state = readJSON(storageKeys.qr);
  }

  getState() {
    return this.state;
  }

  async refresh(accessToken, { background = true } = {}) {
    // Emit intermediate state so UI can show "refreshing" while request is in flight.
    this.onState({ ...this.state, refreshing: background });
    try {
      const result = await fetchQrCode(accessToken);
      const expiresIn = result.expires_in ?? result.expiresIn ?? result.ExpiresIn ?? 30;
      const expiresAtRaw = result.expires_at ?? result.expiresAt ?? result.ExpiresAt;
      const refreshIn = result.refresh_in ?? result.refreshIn ?? result.RefreshIn;
      const refreshAtRaw = result.refresh_at ?? result.refreshAt ?? result.RefreshAt;
      const expires_at = normalizeExpiresAt(expiresAtRaw, expiresIn, this.now());
      const refresh_at = normalizeRefreshAt(refreshAtRaw, refreshIn, this.now());
      // Normalize API variations into one state shape persisted in localStorage.
      this.state = { ...result, expires_at, refresh_at, refreshing: false };
      saveJSON(storageKeys.qr, this.state);
      this.onState(this.state);
      this.schedule(accessToken);
      return this.state;
    } catch (error) {
      this.onState({ ...this.state, refreshing: false });
      this.onError(error);
      throw error;
    }
  }

  schedule(accessToken) {
    if (!this.state?.refresh_at && !this.state?.expires_at) return;
    if (this.timer) this.clearTimeoutFn(this.timer);
    // Prefer explicit refresh_at from API; fall back to expiry minus 10 seconds.
    const refreshAt = this.state.refresh_at ?? (this.state.expires_at - 10 * 1000);
    const delay = clampDelay(refreshAt - this.now());

    this.timer = this.setTimeoutFn(() => {
      this.refresh(accessToken, { background: true }).catch(() => {});
    }, delay);
  }

  clearTimer() {
    if (this.timer) this.clearTimeoutFn(this.timer);
    this.timer = null;
  }
}

function normalizeExpiresAt(expiresAtRaw, expiresIn, now) {
  if (typeof expiresAtRaw === 'number' && Number.isFinite(expiresAtRaw)) return expiresAtRaw;
  if (typeof expiresAtRaw === 'string') {
    const parsed = Date.parse(expiresAtRaw);
    if (Number.isFinite(parsed)) return parsed;
  }
  const seconds = typeof expiresIn === 'string' ? parseDurationToSeconds(expiresIn) : Number(expiresIn);
  return toEpochMs(Number.isFinite(seconds) ? seconds : 30, now);
}

function normalizeRefreshAt(refreshAtRaw, refreshIn, now) {
  if (typeof refreshAtRaw === 'number' && Number.isFinite(refreshAtRaw)) return refreshAtRaw;
  if (typeof refreshAtRaw === 'string') {
    const parsed = Date.parse(refreshAtRaw);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (refreshIn == null) return null;
  const seconds = typeof refreshIn === 'string' ? parseDurationToSeconds(refreshIn) : Number(refreshIn);
  if (!Number.isFinite(seconds)) return null;
  return toEpochMs(seconds, now);
}

function parseDurationToSeconds(value) {
  const parts = String(value).split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return NaN;
}
