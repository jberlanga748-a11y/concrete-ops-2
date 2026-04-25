# Deployment

## Production

- App: `concrete-ops-2`
- URL: [https://concrete-ops-2.fly.dev/](https://concrete-ops-2.fly.dev/)
- Provider: Fly.io
- Region: `sjc`
- Volume: `concrete_ops_data`
- Mounted path: `/app/data`
- SQLite file: `/app/data/app-data.sqlite`

## Status

- Machine is running
- Health and readiness checks are passing
- `GET /api/ready` returns `200`
- Database readiness reports `ok`
- First admin bootstrap completed successfully

## Restart checkpoint

- Fly machine `148e06e2b53d68` was restarted successfully on 2026-04-25
- The production app loaded successfully from [https://concrete-ops-2.fly.dev/](https://concrete-ops-2.fly.dev/) after restart
- `GET /api/ready` returned `200` after restart with `database: ok`
- The SQLite file still exists at `/app/data/app-data.sqlite`
- `GET /api/setup/status` confirmed `needsSetup=false`, `hasUsers=true`, `demoMode=false`, and `demoUserExists=false`
- Fly logs after restart show a successful `POST /api/auth/login` and successful `GET /api/bootstrap`
- Persistent data remained on the mounted `concrete_ops_data` volume after restart
- No application-level API errors were observed after the machine was healthy
- Fly emitted one brief platform health-check error during startup before the app finished binding port `4000`, and the check passed immediately afterward

## Notes

- Older `sea` examples are deprecated for this deployment; use `sjc`
- Fly readiness checks should continue to target `GET /api/ready`
- Production deploys keep `SEED_DEMO_DATA=false`

## Observed successful requests

- `/`
- `/api/health`
- `/api/ready`
- `/api/setup/status`
- `/api/setup/bootstrap-admin`
- `/api/bootstrap`

## Typical Fly commands

```bash
fly launch --no-deploy
fly volumes create concrete_ops_data --size 1 --region sjc
fly secrets set BOOTSTRAP_ADMIN_EMAIL=admin@example.com BOOTSTRAP_ADMIN_PASSWORD=change-me-now
fly deploy
```
