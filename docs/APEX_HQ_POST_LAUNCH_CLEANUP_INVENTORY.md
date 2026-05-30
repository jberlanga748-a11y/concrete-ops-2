# Apex HQ Post-Launch Cleanup Inventory

Last updated: 2026-05-30

Purpose: record post-launch workspace cleanup candidates after the Phase 8-14 release without deleting or moving anything. This is an inventory only. Do not delete, archive, move, or stage these files without explicit cleanup approval from Josh.

## Current Rule

- Current production release is `v616` on Fly app `concrete-ops-2`, active commit `e904e5a`.
- Cleanup must stay local/repo-only unless a separate production-safe release is approved.
- Do not remove artifacts that may be needed as QA evidence, demo assets, security-support evidence, or rollback context until they are reviewed.
- Do not commit local data files, browser profiles, screenshots, media exports, admin scripts, logs, or SQLite databases unless a specific artifact is intentionally promoted into docs.

## Cleanup Execution Log

2026-05-30: Josh approved the post-launch cleanup pass. Untracked temp/demo/security-support artifacts were moved, not deleted, from `C:\Users\jberl\Documents\New project` to `C:\Users\jberl\Documents\Apex HQ cleanup archive\2026-05-30-post-launch-ce7a0f3`. The archive includes `MANIFEST.txt` listing each top-level artifact group that was moved. `git status --short --untracked-files=all` was clean after the move.

## Cleanup Candidate Groups

| Group | Current examples | Recommended handling |
| --- | --- | --- |
| Phase/dev logs | `.codex-run/phase10-dev*.log`, `codex-phase-audit*.log`, `codex-proposal-*.log`, `codex-ui-audit*.log`, `tmp-*-serve-*.log` | Safe to delete after approval if no longer needed for QA traceability. |
| Temporary browser/QA data | `tmp-codex-phase*-browser-data/`, `tmp-codex-*-data/`, `tmp-phase6-browser-data/` | Review first, then delete after approval if screenshots, traces, and browser profiles are no longer needed. |
| Local SQLite/test data | `tmp-codex-phase-audit-data/`, `tmp-codex-phase7-preaudit-data*/`, any `app-data.sqlite`, `*-shm`, or `*-wal` under temp/demo folders | Treat as sensitive local data. Do not commit. Delete only after approval and only from known temp/demo paths. |
| Demo video package | `apex-hq-demo-video-package/` | Decide whether this is an active deliverable. If yes, move/track intentionally; if no, archive outside the active app repo or delete after approval. |
| Proposal mockups/apps | `last-yard-proposal-app/`, `last-yard-proposal-mockup/` | Review for historical/demo value. Keep out of active Apex HQ build unless Josh explicitly asks to preserve or migrate them. |
| Windows admin/security-support scripts | `codex-*-admin.ps1`, `codex-*-admin.cmd`, `codex-malware-cleanup.ps1` | Keep untracked unless intentionally retained. Review with Josh before deletion because they may relate to machine cleanup, not Apex HQ product code. |
| PDF/visual audit exports | `tmp-codex-pdf-visual-audit/`, UI audit screenshot folders under temp paths | Preserve only if needed as launch or demo evidence; otherwise delete after approval. |

## Suggested Cleanup Order

1. Confirm whether `apex-hq-demo-video-package/`, `last-yard-proposal-app/`, and `last-yard-proposal-mockup/` are still needed.
2. If not needed, archive them outside `C:\Users\jberl\Documents\New project` or delete them after approval.
3. Delete temp logs and browser profiles after approval.
4. Delete temp SQLite/demo data after approval, verifying paths are inside known temp/demo directories before removal.
5. Re-run `git status --short` and confirm the active repo contains only intentional tracked source/docs changes.

## Non-Goals

- No production cleanup.
- No database mutation.
- No deploy.
- No secret changes.
- No deletion without approval.
