const isLocalhost =
  typeof globalThis.location !== 'undefined' &&
  /^(http:\/\/localhost|http:\/\/127\.0\.0\.1)(:\d+)?$/.test(globalThis.location.origin);

export const config = {
  apiBaseUrl: isLocalhost ? '/proxy/capi' : 'https://capi.puregym.com',
  authBaseUrl: 'https://auth.puregym.com',
  tokenPath: '/connect/token',
  qrPath: '/api/v2/member/qrcode',
  tokenBasicAuth: 'Basic cm8uY2xpZW50Og==',
  tokenScope: 'pgcapi offline_access',
};

export const storageKeys = {
  auth: 'scan_to_gym_auth',
  qr: 'scan_to_gym_qr',
};
