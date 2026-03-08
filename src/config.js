export const config = {
  apiBaseUrl: 'https://capi.puregym.com',
  authBaseUrl: 'https://auth.puregym.com',
  tokenPath: '/oauth/token',
  qrPath: '/api/v2/member/qrcode',
  profilePaths: ['/api/v2/member', '/api/v1/member'],
  // Public app identifiers change over time. Keep editable for self-hosters.
  clientId: 'puregym-app',
  scope: 'openid profile email offline_access',
};

export const storageKeys = {
  auth: 'scan_to_gym_auth',
  qr: 'scan_to_gym_qr',
  profile: 'scan_to_gym_profile',
};
