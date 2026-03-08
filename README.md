# Scan to Gym (Mobile SPA)

A lightweight, mobile-first single page web app designed for low-bandwidth usage and static hosting on GitHub Pages.

## What this app does

- Shows a login view (username + PIN) on first load.
- Uses a documented OAuth-style member auth flow inspired by:
  - https://raincoatmoon.com/blog/reverse-engineering-adventure/
  - https://drobinin.com/posts/how-i-accidentally-became-puregyms-unofficial-apple-wallet-developer/
- Stores auth/session state in `localStorage` (`access_token`, `refresh_token`, `expires_in`, `expires_at`, plus profile and QR state).
- Fetches and displays member QR information (`/api/v2/member/qrcode`).
- Refreshes QR in background at `qr_expiry - 10 seconds` while keeping current QR visible.
- Supports manual QR refresh.
- Automatically refreshes access token at `token_expiry - 5 minutes`.
- Includes collapsible user sidebar/menu with logout.
- Logout clears local storage and returns user to login.

> Note: API providers may change endpoint contracts and required public `client_id` values. Keep `src/config.js` configurable for your deployment.

## Tech choices

To keep payload and runtime overhead minimal for weak connectivity, this implementation uses vanilla ES modules and CSS (no framework runtime bundle). It remains fully static and GitHub Pages friendly.

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
- Python 3 (for local static server)

### Install

No package installation is required.

### Run locally

```bash
npm run start
```

Open `http://localhost:4173`.

### Run tests

```bash
npm test
```

## Deployment (GitHub Pages)

This repo includes a GitHub Actions workflow that:

1. Runs tests for pull requests.
2. On pushes to `main`, runs tests and deploys static site to GitHub Pages.

### One-time GitHub setup

In your repository settings:

- **Pages → Build and deployment → Source**: `GitHub Actions`.
- Ensure Actions are enabled.

## Security notes

- Never commit real credentials, tokens, cookies, or device identifiers.
- This app stores tokens in browser localStorage for persistence only on the user device.
- Treat hosted instances as personal-use clients unless you have explicit provider permission.
