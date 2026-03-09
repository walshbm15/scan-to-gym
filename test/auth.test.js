import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthController } from '../src/auth.js';
import { config, storageKeys } from '../src/config.js';
import { createLocalStorageMock, installFetchMock } from './helpers.js';

function okJson(payload) {
  return Promise.resolve({ ok: true, json: async () => payload });
}

test('login stores auth and schedules token refresh 5 minutes before expiry', async () => {
  global.localStorage = createLocalStorageMock();
  const timeouts = [];
  let tokenRequest;
  let tokenCallCount = 0;
  installFetchMock(async (url, options = {}) => {
    if (String(url).includes('/connect/token')) {
      tokenCallCount += 1;
      tokenRequest = options;
      return okJson({ access_token: 'a1', refresh_token: 'r1', expires_in: 3600, username: 'u@example.com' });
    }
    throw new Error(`Unexpected endpoint: ${url}`);
  });

  const auth = new AuthController({
    now: () => 0,
    setTimeoutFn: (cb, delay) => {
      timeouts.push({ cb, delay });
      return timeouts.length;
    },
    clearTimeoutFn: () => {},
  });

  const state = await auth.login('u@example.com', '1234');
  assert.equal(state.expires_at, 3600000);
  assert.equal(timeouts[0].delay, 3300000);

  const stored = JSON.parse(localStorage.getItem(storageKeys.auth));
  assert.equal(stored.refresh_token, 'r1');
  assert.equal(stored.member_pin, '1234');
  assert.equal(tokenCallCount, 1);
  assert.equal(tokenRequest.method, 'POST');
  assert.equal(tokenRequest.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(tokenRequest.headers.Authorization, undefined);
  const loginBody = new URLSearchParams(tokenRequest.body);
  assert.equal(loginBody.get('grant_type'), 'password');
  assert.equal(loginBody.get('username'), 'u@example.com');
  assert.equal(loginBody.get('password'), '1234');
  assert.equal(loginBody.get('scope'), config.tokenScope);
  assert.equal(loginBody.get('client_id'), config.tokenClientId);
});

test('refresh keeps old refresh token if API does not return a new one', async () => {
  global.localStorage = createLocalStorageMock();
  localStorage.setItem(storageKeys.auth, JSON.stringify({
    access_token: 'old',
    refresh_token: 'r-old',
    expires_at: 10000,
    member_pin: '98765432',
  }));

  let callCount = 0;
  let tokenRequest;
  installFetchMock(async (url, options = {}) => {
    if (String(url).includes('/connect/token')) {
      callCount += 1;
      tokenRequest = options;
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
  assert.equal(auth.getAuth().member_pin, '98765432');
  assert.equal(tokenRequest.headers.Authorization, undefined);
  const refreshBody = new URLSearchParams(tokenRequest.body);
  assert.equal(refreshBody.get('grant_type'), 'refresh_token');
  assert.equal(refreshBody.get('refresh_token'), 'r-old');
  assert.equal(refreshBody.get('scope'), config.tokenScope);
  assert.equal(refreshBody.get('client_id'), config.tokenClientId);
});
