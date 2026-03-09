# Scan to Gym (Mobile SPA)

A lightweight, mobile-first single page web app for viewing a PureGym check-in QR code.

## What this app does

- Shows a login view (username + PIN) on first load.
- Uses a documented OAuth-style member auth flow inspired by:
  - https://raincoatmoon.com/blog/reverse-engineering-adventure/
  - https://drobinin.com/posts/how-i-accidentally-became-puregyms-unofficial-apple-wallet-developer/
- Calls `POST /connect/token` with form-urlencoded body for login/refresh token flow.
- Stores auth/session state in `localStorage` (`access_token`, `refresh_token`, `expires_in`, `expires_at`, `member_pin`, plus QR state).
- Fetches member QR information from `GET /api/v2/member/qrcode` with bearer token.
- After login, automatically fetches QR and displays it on the QR screen.
- Displays the stored member PIN above the QR code in `xxxx-xxxx` format as a backup option if the QR code does not refresh due to poor network connectivity.
- Refreshes QR in background at `qr_expiry - 10 seconds` while keeping current QR visible.
- Supports manual QR refresh.
- Automatically refreshes access token at `token_expiry - 5 minutes`.
- Converts token-style QR payloads (for example `exerp:checkin:...`) into a scannable QR image client-side.
- Supports pressing `Enter` on the login screen (username or PIN field) to trigger login.
- Includes a simplified sidebar/menu with logout in the logged-in view.
- Logout clears local storage and returns user to login.

> Note: API providers may change endpoint contracts and auth requirements. Keep `src/config.js` configurable for your deployment.

## Tech choices

To keep runtime overhead minimal, this app uses vanilla ES modules and CSS. It uses Vite for local dev/build and includes a dev proxy for CORS during local testing.

## Project structure

- `index.html`: shell and UI sections.
- `src/app.js`: UI state, event handling, login/logout, hydration.
- `src/auth.js`: auth lifecycle and pre-expiry token refresh scheduling.
- `src/qr.js`: QR fetch lifecycle and pre-expiry QR refresh scheduling.
- `src/api.js`: API request methods.
- `src/storage.js`: local storage utilities.
- `src/config.js`: endpoint/client config and storage keys.
- `test/*.test.js`: unit tests for token/QR/storage/time behavior.

## Setup

### Prerequisites

- Node.js 20+

### Install

```bash
npm install
```

### Run locally (hot reload + local API proxy)

```bash
npm run dev
```

Open `http://localhost:4173`.

Notes:
- `npm run start` is currently an alias of the same Vite dev server command.
- In local dev, API requests are proxied via `/proxy/capi` to `https://capi.puregym.com` (see `vite.config.js`) to avoid browser CORS failures.

### Run tests

```bash
npm test
```

## Build and preview

```bash
npm run build
npm run preview
```

## Production deployment notes

- The Vite proxy only works in local dev.
- A static host (including GitHub Pages) cannot proxy API requests by itself.
- For production, use either:
  - An API/service endpoint that allows your origin via CORS, or
  - Your own backend/edge/serverless proxy and point `authBaseUrl`/`apiBaseUrl` to it.

## Security notes

- Never commit real credentials, tokens, cookies, or device identifiers.
- This app stores tokens in browser localStorage for persistence only on the user device.
- Treat hosted instances as personal-use clients unless you have explicit provider permission.
