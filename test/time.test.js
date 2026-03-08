import test from 'node:test';
import assert from 'node:assert/strict';
import { toEpochMs, secondsUntil, clampDelay } from '../src/time.js';

test('toEpochMs converts seconds correctly', () => {
  assert.equal(toEpochMs(30, 1000), 31000);
});

test('secondsUntil returns floor seconds', () => {
  assert.equal(secondsUntil(5500, 1000), 4);
});

test('clampDelay never goes negative', () => {
  assert.equal(clampDelay(-5), 0);
  assert.equal(clampDelay(25), 25);
});
