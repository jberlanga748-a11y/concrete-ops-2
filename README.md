# Concrete Ops

Concrete Ops is a full-stack operations workspace for a concrete contractor. It includes:

- A React + Vite frontend
- An Express API
- Token-based demo auth
- SQLite-backed persistence for leads, jobs, queue items, and activity

## Demo Login

- Email: `ops@lastyard.test`
- Password: `concrete123`

## Scripts

- `npm run dev` starts the API and frontend together
- `npm run build` builds the frontend
- `npm run serve` serves the built app with the Node server

If you open only the static frontend without the Node server, login will not work because authentication depends on the local `/api` backend.

## Docker

The app can also run as a single container because the Node server already serves the built frontend and the API together.

### Build and run

```bash
docker build -t concrete-ops .
docker run --rm -p 4000:4000 -v "$(pwd)/data:/app/data" concrete-ops
```

### Compose

```bash
docker compose up --build
```

The SQLite database stays persistent by mounting `./data` into `/app/data` in the container.

## Data directory

By default the server stores SQLite data in `./data`. You can override that with the `DATA_DIR` environment variable, which is useful for isolated test runs and alternate deploy layouts.

## Environment config

The backend now reads its runtime settings from a shared validated config module and loads `.env` automatically when present. Copy `.env.example` to `.env` if you want a local starting point.

- `PORT`: API/server port, defaults to `4000`
- `DATA_DIR`: directory for SQLite files, defaults to `./data`
- `SESSION_TTL_HOURS`: rolling auth session lifetime, defaults to `168`
- `SMOKE_TEST_PORT`: port used by `npm run verify:server`, defaults to `4100`
- `NODE_ENV`: `development`, `test`, or `production`

## Storage

Runtime data is stored locally in SQLite at `data/app-data.sqlite`.

The SQLite store includes schema version tracking so future backend changes can be applied through migrations instead of one-off rewrites.

Demo sessions now use rolling expiration and are cleaned up when they expire.

The API now validates enum fields and numeric ranges and returns `404` for missing records instead of silently succeeding.

Record detail edits use debounced autosave on the frontend so typing does not generate one API request per keystroke.
