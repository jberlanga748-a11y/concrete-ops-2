# Apex HQ

Apex HQ is a full-stack contractor operations workspace. It includes:

- A React + Vite frontend
- An Express API
- Token-based demo auth
- SQLite-backed persistence for leads, jobs, queue items, and activity

## Demo Login

- Email: `demo.ops@apexhq.app`
- Password: `apexdemo123`

The demo account is available by default in development. In production, demo data is disabled by default and the first admin can be created through the setup screen or environment bootstrap variables.

## Scripts

- `npm run dev` starts the API and frontend together
- `npm run build` builds the frontend
- `npm run serve` serves the built app with the Node server
- `npm run audit:demo-desktop` logs into the demo Fly app and captures desktop screenshots for UI review
- `npm run audit:visual-polish` logs into the local app and checks route-wide visual polish, overflow, assistant overlap, console/network failures, and field-role exposure
- `npm run audit:visual-polish:chromium` runs the same sweep with bundled Chromium for stable local QA
- `npm run audit:visual-polish:tablet` runs the tablet owner/admin and field-role route sweep

If you open only the static frontend without the Node server, login will not work because authentication depends on the local `/api` backend.

## Desktop UI audit

Use the Playwright-based audit runner to capture desktop screenshots from the live demo workspace without modifying demo data:

```bash
npm run audit:demo-desktop
```

Optional filters:

```bash
npm run audit:demo-desktop -- --roles=admin --viewports=1440x900
```

Screenshots are saved under `ui-audit/demo-desktop/<timestamp>/` and are ignored by git. The script only signs in, navigates, and captures screenshots for the configured routes.

## Visual polish route audit

Use the local Playwright-based route audit when checking Apex HQ against the north-star visual system. Start the local app first, then run:

```bash
npm run audit:visual-polish
```

The default sweep checks admin desktop, admin phone, and employee phone across the app route list. For tablet coverage, run:

```bash
npm run audit:visual-polish:tablet
```

Useful focused options:

```bash
npm run audit:visual-polish:chromium -- --routes=/,/estimates,/jobs --viewports=desktop,tablet
npm run audit:visual-polish:tablet -- --routes=/,/estimates,/jobs
```

Audit manifests and failure screenshots are saved under `ui-audit/visual-polish/<timestamp>/` and are ignored by git. The audit is read-only: it logs in, navigates, checks route health and layout signals, and writes local evidence only.

## Docker

The app can also run as a single container because the Node server already serves the built frontend and the API together.

### Build and run

```bash
docker build -t apex-hq-local .
docker run --rm -p 4000:4000 -v "$(pwd)/data:/app/data" apex-hq-local
```

### Compose

```bash
docker compose up --build
```

The SQLite database stays persistent by mounting `./data` into `/app/data` in the container. The local compose setup explicitly keeps `SEED_DEMO_DATA=true` so the demo login remains available inside the containerized development flow.

## Fly.io deployment

The repo includes a [fly.toml](fly.toml) wired for the existing Dockerfile, SQLite volume storage, and readiness checks.

Successful production deploy:

- Production URL: [https://app.apexhq.online/](https://app.apexhq.online/)
- Fly app: use the configured production app in `fly.toml`
- Active region: `sjc`
- Mounted volume: the configured production data volume
- SQLite path: `/app/data/app-data.sqlite`
- Readiness endpoint: `GET /api/ready`

Important notes:

- `fly.toml` contains the current Fly app identifier; keep it unchanged unless an infrastructure rename is planned
- Fly's older `sea` examples are deprecated for this app; the config now uses `sjc`
- production deploys set `SEED_DEMO_DATA=false`
- runtime SQLite data is mounted at `/app/data`
- Fly health checks call `GET /api/ready`

Important separation rules:

- `fly.toml` is the production config and must keep `SEED_DEMO_DATA=false`
- customer pilots must use a separate Fly app and a separate Fly volume
- customer pilots must keep `DEMO_MODE` off
- customer pilots should follow [CUSTOMER_PILOT_SETUP.md](CUSTOMER_PILOT_SETUP.md)

Typical first deploy flow:

```bash
fly launch --no-deploy
fly volumes create apex_hq_prod_data --size 1 --region sjc
fly secrets set BOOTSTRAP_ADMIN_EMAIL=admin@example.com BOOTSTRAP_ADMIN_PASSWORD=change-me-now
fly deploy
```

After the first admin is created, you can remove the bootstrap password secret if you prefer to manage users only through the app later.

Deployment checkpoint:

- Machine started successfully in `sjc`
- Health and readiness checks are passing
- `/api/ready` returns `200` with `database: ok`
- The first admin was created successfully through `POST /api/setup/bootstrap-admin`
- Production logs confirm successful requests to `/`, `/api/health`, `/api/ready`, `/api/setup/status`, `/api/setup/bootstrap-admin`, and `/api/bootstrap`

## Data directory

By default the server stores SQLite data in `./data`. You can override that with the `DATA_DIR` environment variable, which is useful for isolated test runs and alternate deploy layouts.

## Environment config

The backend now reads its runtime settings from a shared validated config module and loads `.env` automatically when present. Copy `.env.example` to `.env` if you want a local starting point.

- `PORT`: API/server port, defaults to `4000`
- `DATA_DIR`: directory for SQLite files, defaults to `./data`
- `BACKUP_DIR`: directory for generated backup/export artifacts, defaults to `./data/backups`
- `SEED_DEMO_DATA`: whether to seed the demo workspace automatically, defaults to `true` outside production and `false` in production
- `BOOTSTRAP_ADMIN_EMAIL`: optional first admin email for environment-based bootstrap
- `BOOTSTRAP_ADMIN_PASSWORD`: optional first admin password for environment-based bootstrap
- `BOOTSTRAP_ADMIN_NAME`: display name for the bootstrapped admin, defaults to `Operations Admin`
- `BOOTSTRAP_ADMIN_ROLE`: role label for the bootstrapped admin, defaults to `Administrator`
- `SESSION_TTL_HOURS`: rolling auth session lifetime, defaults to `168`
- `SMOKE_TEST_PORT`: port used by `npm run verify:server`, defaults to `4100`
- `NODE_ENV`: `development`, `test`, or `production`
- `LOG_LEVEL`: `debug`, `info`, `warn`, or `error`, defaults to `info`

## Health checks

The backend exposes two operational endpoints:

- `GET /api/health`: liveness check for the Node process
- `GET /api/ready`: readiness check that verifies SQLite can be initialized and used

Server logs are now emitted as structured JSON so they are easier to filter in local terminals and deployment platforms.

Each HTTP response also includes an `X-Request-Id` header, and API error payloads include the same request ID for easier troubleshooting.

## Storage

Runtime data is stored locally in SQLite at `data/app-data.sqlite`.

## First-run admin setup

Fresh production installs no longer create the demo user automatically. You now have two supported setup paths:

- Interactive setup: start with `NODE_ENV=production` and no users in the database, then open the app and create the first admin from the setup screen
- Environment bootstrap: set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` before first boot to create the first admin automatically

The backend exposes `GET /api/setup/status` to detect whether a workspace still needs its first admin, and `POST /api/setup/bootstrap-admin` to create that first admin when no users exist yet.

### Setup visibility

The login/setup screen also shows whether the workspace is in demo mode or live mode, and `/api/setup/status` exposes the same operational flags so operators can confirm the environment before handing a workspace to a customer.

## Backup and export

Run `npm run backup:data` to create two timestamped artifacts:

- a consistent SQLite backup created with SQLite's `VACUUM INTO`
- a JSON export of the current application state

By default those files are written under `data/backups`. The JSON export includes operational data, users, sessions, and password hashes, so treat it as sensitive local backup material.

Leads, jobs, queue items, and activity entries now also carry `createdAt` and `updatedAt` timestamps so record detail views and future audit history can rely on durable backend timestamps instead of client-only timing guesses.

The workspace also keeps a durable audit history for record creates, updates, conversions, queue toggles, first-run admin setup, and demo resets, and surfaces the latest entries in the Settings screen.

Leads, jobs, and queue items now support archive-first deletion: records can be archived from the UI, restored if needed, and only permanently deleted after they have been archived, with each lifecycle step recorded in audit history.

Lead and job detail views now use durable browser URLs like `/leads/:id` and `/jobs/:id`, so selected records survive refreshes and can be opened directly as long as the app is running through the bundled Node server.

Workspace reset stays available only when demo data seeding is enabled.

## CI

GitHub Actions now runs on pushes and pull requests via `.github/workflows/ci.yml` and executes:

- `npm ci`
- `npm run build`
- `npm run verify:server`
- `npm run verify:backup`

The SQLite store includes schema version tracking so future backend changes can be applied through migrations instead of one-off rewrites.

Demo sessions now use rolling expiration and are cleaned up when they expire.

The API now validates enum fields and numeric ranges and returns `404` for missing records instead of silently succeeding.

Record detail edits use debounced autosave on the frontend so typing does not generate one API request per keystroke.
