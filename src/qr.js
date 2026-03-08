import { storageKeys } from './config.js';
import { saveJSON, readJSON } from './storage.js';
import { clampDelay, toEpochMs } from './time.js';
import { fetchQrCode } from './api.js';

export class QrController {
  constructor({ now = () => Date.now(), setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout, onState = () => {}, onError = () => {} } = {}) {
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
    this.onState({ ...this.state, refreshing: background });
    try {
      const result = await fetchQrCode(accessToken);
      const expiresIn = result.expires_in ?? result.expiresIn ?? 30;
      const expires_at = result.expires_at ?? toEpochMs(expiresIn, this.now());
      this.state = { ...result, expires_at, refreshing: false };
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
    if (!this.state?.expires_at) return;
    if (this.timer) this.clearTimeoutFn(this.timer);
    const refreshAt = this.state.expires_at - 10 * 1000;
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
