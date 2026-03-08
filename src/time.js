export function toEpochMs(secondsFromNow, now = Date.now()) {
  return now + Number(secondsFromNow) * 1000;
}

export function secondsUntil(epochMs, now = Date.now()) {
  return Math.floor((epochMs - now) / 1000);
}

export function clampDelay(ms) {
  return Math.max(0, ms);
}
