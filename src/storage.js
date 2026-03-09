import { storageKeys } from './config.js';

export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readJSON(key) {
  const value = localStorage.getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function clearAuthData() {
  localStorage.removeItem(storageKeys.auth);
  localStorage.removeItem(storageKeys.qr);
}
