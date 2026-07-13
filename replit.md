# Swans ShuttleHub

A production-quality Progressive Web App for Swans Travel — records passenger loading figures on internal staff shuttle services and provides a live operational dashboard for the traffic office.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at /api)
- `pnpm --filter @workspace/shuttlehub run dev` — run the frontend PWA (served at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — session secret for express-session

## Default Login Credentials

- **Admin:** `admin` / `admin123`
- **Driver (John Smith):** `john.smith` / `driver123`
- **Driver (Sarah Jones):** `sarah.jones` / `driver123`
- **Driver (Mike Brown):** `mike.brown` / `driver123`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Wouter routing, Framer Motion, Recharts, Leaflet
- API: Express 5, session-based auth (express-session + bcrypt)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `artifacts/shuttlehub/src/` — React frontend (driver app + admin dashboard)
- `artifacts/api-server/src/routes/` — All API route handlers
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle ORM table definitions
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod validation schemas (do not edit)

## Architecture decisions

- Session-based auth via express-session + bcrypt (no external auth provider needed for internal tool)
- Role-based access: `admin` gets full dashboard/reports/admin portal; `driver` gets mobile duty app
- Driver Quick Login on login page: drivers select their name from a dropdown (no typing)
- Offline support: passenger records and GPS positions queued in localStorage, synced on reconnect
- GPS geofencing: computes haversine distance to each stop — auto-highlights matching timetable entry when within geofence radius
- Leaflet + OpenStreetMap for live dashboard map (no API key required)
- Server-Sent Events not required — dashboard polls /api/dashboard/duty-status every 15s

## Product

- **Driver App** — Mobile-first. Drivers select their duty (8 large cards), then submit passenger counts at each stop. GPS auto-detects current stop via geofencing. Fully offline-capable.
- **Live Dashboard** — Admin desktop view. Leaflet map with colour-coded vehicle markers (green/amber/red/grey). Real-time summary bar. Per-duty status cards.
- **Reports** — Daily/weekly/monthly totals, by duty, by stop, by hour. Missing/late submission reports. CSV export.
- **Admin Portal** — CRUD for drivers, vehicles, duties, stops, timetables, users. Audit log. Settings.

## User preferences

- Company name: Swans Travel
- App name: Swans ShuttleHub
- Palette: Navy blue, white, light blue (transport industry)
- Dark mode by default
- Large touch-friendly buttons on mobile (driver screens)

## Gotchas

- After OpenAPI spec changes, always run `pnpm --filter @workspace/api-spec run codegen` before touching frontend or backend
- The `scheduled_time` column in `timetable_entries` is `text` (HH:MM) — not a timestamp
- The `date` column in `passenger_records` is a `date` string (YYYY-MM-DD)
- Sessions use `sameSite: 'lax'` in development and `'none'` in production — ensure HTTPS in production

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
