export const config = {
  apiBaseUrl: 'https://capi.puregym.com',
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
