import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthController } from '../src/auth.js';
import { storageKeys } from '../src/config.js';
import { createLocalStorageMock, installFetchMock } from './helpers.js';

function okJson(payload) {
  return Promise.resolve({ ok: true, json: async () => payload });
}

test('login stores auth and schedules token refresh 5 minutes before expiry', async () => {
  global.localStorage = createLocalStorageMock();
  const timeouts = [];
  installFetchMock(async (url) => {
    if (String(url).includes('/oauth/token')) {
      return okJson({ access_token: 'a1', refresh_token: 'r1', expires_in: 3600, username: 'u' });
    }
    return okJson({ firstName: 'Alex' });
  });

  const auth = new AuthController({
    now: () => 0,
    setTimeoutFn: (cb, delay) => {
      timeouts.push({ cb, delay });
      return timeouts.length;
    },
    clearTimeoutFn: () => {},
  });

  const state = await auth.login('u', '1234');
  assert.equal(state.expires_at, 3600000);
  assert.equal(timeouts[0].delay, 3300000);

  const stored = JSON.parse(localStorage.getItem(storageKeys.auth));
  assert.equal(stored.refresh_token, 'r1');
  assert.equal(JSON.parse(localStorage.getItem(storageKeys.profile)).firstName, 'Alex');
});

test('refresh keeps old refresh token if API does not return a new one', async () => {
  global.localStorage = createLocalStorageMock();
  localStorage.setItem(storageKeys.auth, JSON.stringify({ access_token: 'old', refresh_token: 'r-old', expires_at: 10000 }));

  let callCount = 0;
  installFetchMock(async (url) => {
    if (String(url).includes('/oauth/token')) {
      callCount += 1;
      return okJson(callCount === 1
        ? { access_token: 'new', expires_in: 3600 }
        : { access_token: 'new2', expires_in: 3600 }
      );
    }
    return okJson({});
  });

  const auth = new AuthController({ now: () => 0, setTimeoutFn: () => 1, clearTimeoutFn: () => {} });
  await auth.refresh();

  assert.equal(auth.getAuth().refresh_token, 'r-old');
});
