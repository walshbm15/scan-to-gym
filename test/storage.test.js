import test from 'node:test';
import assert from 'node:assert/strict';
import { saveJSON, readJSON, clearAuthData } from '../src/storage.js';
import { storageKeys } from '../src/config.js';
import { createLocalStorageMock } from './helpers.js';

test('saveJSON and readJSON round-trip data', () => {
  global.localStorage = createLocalStorageMock();
  saveJSON('x', { a: 1 });
  assert.deepEqual(readJSON('x'), { a: 1 });
});

test('clearAuthData removes all persisted auth fields', () => {
  global.localStorage = createLocalStorageMock();
  localStorage.setItem(storageKeys.auth, '{}');
  localStorage.setItem(storageKeys.qr, '{}');
  clearAuthData();

  assert.equal(localStorage.getItem(storageKeys.auth), null);
  assert.equal(localStorage.getItem(storageKeys.qr), null);
});
