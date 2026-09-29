# VacationPlanner

Vacation planner with an Angular client and Express/MongoDB API.

## Authentication Setup

The API uses MongoDB-backed sessions. Set `MONGODB_URI` as before. In production, also set:

- `SESSION_SECRET`: a random secret of at least 32 bytes.
- `APP_ORIGINS`: comma-separated exact origins allowed to submit state-changing API requests, for example `https://planner.example.com`.
- `API_PROXY_TARGET` on the Angular SSR service: the API origin reachable by that service, for example `http://127.0.0.1:3000`.
- `NODE_ENV=production` so session cookies are marked Secure.
- `ENFORCE_TEMP_PASSWORD_CHANGE=true` only when you want temporary-password accounts to be forced through rotation. It defaults off locally; enable it in Vercel after deployment when ready.

The browser uses same-origin `/api` requests. Angular development proxies them to `http://127.0.0.1:3000`; the production SSR service proxies them to `API_PROXY_TARGET`. Keep the API and UI under the same site and terminate HTTPS at the trusted proxy.

In local development, start MongoDB, then run the API and Angular client with `npm run start:all`. The server generates an ephemeral session secret if `SESSION_SECRET` is unset locally, so development sessions expire when that server restarts.

Existing MongoDB users have no password until bootstrapped. From the repository root, run `npm run auth:bootstrap -- --confirm` once (or run the same command from the `server` directory). This generates a unique random temporary password for each uninitialized account and prints them once to the terminal. Deliver each password separately through a secure channel, and clear the terminal output afterward. Every account must change its password at first sign-in when `ENFORCE_TEMP_PASSWORD_CHANGE=true`. Do not use a shared password or commit credentials.

New accounts created by a manager or HR user also receive a unique temporary password, displayed once in the admin page. The user must change it before using the planner.

## Checks

- Client: `cd client && npm test -- --watch=false`
- Server: `cd server && npm test`
- Full build: `npm run build:all`
