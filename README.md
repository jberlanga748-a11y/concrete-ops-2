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

## Storage

Runtime data is stored locally in SQLite at `data/app-data.sqlite`.

The SQLite store includes schema version tracking so future backend changes can be applied through migrations instead of one-off rewrites.

Demo sessions now use rolling expiration and are cleaned up when they expire.
