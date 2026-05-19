# Apex HQ Restore Runbook

Status: Phase 1 pilot-readiness runbook

Purpose: define how Apex HQ backups are created, verified, protected, and restored in a safe drill before any real production restore is considered.

## Current Backup Behavior

Apex HQ currently has backup/export tooling, not an automated production restore tool.

- Backup command: `npm run backup:data`
- Backup verifier: `npm run verify:backup`
- Backup entry file: `server/backup-export.js`
- Backup implementation: `createBackupArtifacts()` in `server/store.js`
- Default database path: `data/app-data.sqlite`
- Default backup directory: `data/backups`
- Override database path with `DATA_DIR`
- Override backup path with `BACKUP_DIR`

The backup command creates two timestamped artifacts:

- `app-data-<timestamp>.sqlite`: SQLite backup created with `VACUUM INTO`
- `app-data-<timestamp>.json`: full JSON application-state export

The JSON export is sensitive. Treat it like a database backup because it can include operational data, users, sessions, token hashes, and password hashes.

## What `verify:backup` Proves

`npm run verify:backup` uses temporary directories, runs the backup command, confirms both backup artifacts exist, checks key exported records, and compares selected SQLite table counts with the JSON export.

It proves backup artifact creation and basic consistency.

It does not prove that a restored app can boot from a backup. That requires the restore drill below.

## Restore Safety Rules

Never run a restore drill against:

- Fly production app `concrete-ops-2`
- Fly production volume `concrete_ops_data`
- Fly demo app `concrete-ops-demo`
- Fly demo volume `concrete_ops_demo_data`
- any customer pilot app
- any customer pilot volume
- repo `./data` if it contains useful local work

Never overwrite a live `app-data.sqlite` until:

- the target app and volume are confirmed
- a fresh backup has been captured
- the restore artifact is identified by full path and timestamp
- a rollback path is written down
- production/customer-data approval is explicit

## Local Restore Drill

This drill uses only throwaway local directories.

1. Create a temporary source data directory and backup directory.

```powershell
$sourceRoot = Join-Path $env:TEMP "apex-restore-source-$([guid]::NewGuid())"
$sourceData = Join-Path $sourceRoot "data"
$sourceBackups = Join-Path $sourceRoot "backups"
New-Item -ItemType Directory -Force -Path $sourceData, $sourceBackups
```

2. Run the backup command against the temporary source.

```powershell
$env:DATA_DIR = $sourceData
$env:BACKUP_DIR = $sourceBackups
npm.cmd run backup:data
```

3. Pick the generated SQLite backup.

```powershell
$backupFile = Get-ChildItem $sourceBackups -Filter "app-data-*.sqlite" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$backupFile.FullName
```

4. Copy the backup into a second temporary restore directory as `app-data.sqlite`.

```powershell
$restoreRoot = Join-Path $env:TEMP "apex-restore-target-$([guid]::NewGuid())"
New-Item -ItemType Directory -Force -Path $restoreRoot
Copy-Item -LiteralPath $backupFile.FullName -Destination (Join-Path $restoreRoot "app-data.sqlite")
```

5. Start the server against the restored copy on a non-production port.

```powershell
$env:DATA_DIR = $restoreRoot
$env:PORT = "4201"
$env:NODE_ENV = "development"
npm.cmd run serve
```

6. In a second terminal, verify readiness.

```powershell
Invoke-RestMethod http://127.0.0.1:4201/api/ready
Invoke-RestMethod http://127.0.0.1:4201/api/setup/status
```

Expected readiness result:

- HTTP `200`
- `status` is `ready`
- `checks.database` is `ok`

7. Stop the local server and remove the temporary directories.

```powershell
Remove-Item -Recurse -Force -LiteralPath $sourceRoot, $restoreRoot
```

## Restore Drill Pass Criteria

A restore drill passes only when:

- backup command exits successfully
- `.sqlite` and `.json` artifacts are present
- restored copy boots from a separate `DATA_DIR`
- `GET /api/ready` returns database `ok`
- `GET /api/setup/status` returns the expected workspace mode
- temporary directories are removed
- the artifact name and command output are recorded

## Real Production Restore Gate

Do not perform a production restore without a production-safety review.

Required before a real restore:

- explicit user approval
- confirmed production target app
- confirmed production volume
- fresh backup captured before restore
- selected restore artifact path and timestamp
- custody notes for backup artifact
- expected user impact
- rollback plan
- post-restore smoke plan

Post-restore checks:

- `GET /api/ready`
- `GET /api/setup/status`
- owner/admin login
- employee/field login
- restricted-route checks
- selected pilot workflow smoke test
- Fly logs for SQLite or startup errors

## Current Gap

Apex HQ does not yet have a dedicated `restore:data` script. Until that exists, full-database restore remains a manual, approval-gated operation using a trusted SQLite backup artifact.
