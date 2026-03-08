import test from 'node:test';
import assert from 'node:assert/strict';
import { QrController } from '../src/qr.js';
import { storageKeys } from '../src/config.js';
import { createLocalStorageMock, installFetchMock } from './helpers.js';

function okJson(payload) {
  return Promise.resolve({ ok: true, json: async () => payload });
}

test('qr refresh stores payload and schedules update at expiry minus 10 seconds', async () => {
  global.localStorage = createLocalStorageMock();
  const timeouts = [];

  installFetchMock(async () => okJson({ qrCode: 'data:image/png;base64,abc', expires_in: 60 }));

  const controller = new QrController({
    now: () => 1000,
    setTimeoutFn: (cb, delay) => {
      timeouts.push({ cb, delay });
      return 1;
    },
    clearTimeoutFn: () => {},
  });

  const state = await controller.refresh('token', { background: true });
  assert.equal(state.expires_at, 61000);
  assert.equal(timeouts[0].delay, 50000);

  const stored = JSON.parse(localStorage.getItem(storageKeys.qr));
  assert.equal(stored.qrCode, 'data:image/png;base64,abc');
});

test('onState exposes background refreshing state', async () => {
  global.localStorage = createLocalStorageMock();
  const events = [];
  installFetchMock(async () => okJson({ code: 'abc', expires_in: 30 }));

  const controller = new QrController({
    now: () => 0,
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {},
    onState: (s) => events.push(s),
  });

  await controller.refresh('token', { background: true });
  assert.equal(events[0].refreshing, true);
  assert.equal(events.at(-1).refreshing, false);
});
