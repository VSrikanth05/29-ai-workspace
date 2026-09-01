# Frontend migration: Vite to Next.js 15

Milestone 1 replaces the legacy React 18/Material UI/Vite runtime with Next.js
15 App Router, React 19, and Tailwind CSS v4.

## Operational changes

- Development port changes from `5173` to `3000`.
- `VITE_API_BASE_URL` is replaced by server-side `BACKEND_INTERNAL_URL`.
- Docker serves the Next.js standalone server on port `3000`; Compose continues
  exposing host port `8080` by default.
- The frontend health check remains `/healthz`.
- Client routing is replaced by App Router routes and nested layouts.

## Database and API impact

There is no schema migration and no backend endpoint change. Existing database
migrations remain valid. Rollback consists of deploying the previous frontend
image; backend and database rollback are unnecessary.

## Deployment migration

Set `BACKEND_INTERNAL_URL` to an address reachable from the Next.js server. In
Compose this is `http://backend:5000`. In Vercel it should be the private or
public Railway/Fly.io API origin. Keep browser traffic on `/api` so credentials,
CORS, and streaming behavior share one origin.
