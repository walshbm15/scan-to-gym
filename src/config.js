const envApiBaseUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined;

export const config = {
  apiBaseUrl: envApiBaseUrl || '/proxy/capi',
  authBaseUrl: 'https://auth.puregym.com',
  tokenPath: '/connect/token',
  qrPath: '/api/v2/member/qrcode',
  tokenScope: 'pgcapi',
  tokenClientId: 'ro.client',
};

export const storageKeys = {
  auth: 'scan_to_gym_auth',
  qr: 'scan_to_gym_qr',
};
