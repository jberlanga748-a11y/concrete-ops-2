# Apex HQ Database Schema Map

Last updated: 2026-05-24

## Current Truth

The app currently runs through `server/store.js` with SQLite as the active runtime store. The production data-platform target is Postgres/Supabase using the migrations in `supabase/migrations/`.

The Postgres schema is intentionally migration-compatible with the existing app IDs (`U-*`, `COMPANY-*`, `L-*`, etc.) instead of forcing UUID primary keys during the first data cutover. That avoids breaking current route state, audit trails, import records, backup exports, and tests that reference existing text IDs.

## Tenant Boundary

`companies.id` is the tenant/workspace boundary. Nearly every business table carries `company_id`; tables without direct tenant ownership are protected through their parent record:

- `estimate_items` is scoped through `estimates.company_id`.
- `app_meta` is server-only.
- `sessions` is server-only and scoped by `current_company_id` plus user identity for any future direct select.
- `app_private` helper functions are available to `authenticated` only so RLS can evaluate tenant scope.

## Core Tables

| Area | Tables | Notes |
| --- | --- | --- |
| Platform | `app_meta`, `companies`, `company_settings` | Schema version, workspace records, package/settings values. |
| Auth | `users`, `sessions` | Custom app auth remains the app source of truth after item 1. Session rows are not exposed to Supabase clients. |
| CRM | `customers`, `leads`, `lead_sources`, `lead_status_history`, `contact_history` | Lead/customer pipeline and manual communication records. |
| Jobs | `jobs`, `job_assignments`, `job_draft_imports` | Field planning, crew assignment, imported proposal handoff. |
| Estimates | `estimates`, `estimate_items`, `rate_book_items` | Office estimating, line items, internal rate book. |
| Field Ops | `daily_reports`, `uploads`, `time_entries`, `delivery_tickets` | Daily field evidence, authenticated file metadata, time tracking, concrete delivery. |
| Safety | `safety_policies`, `ppe_items`, `safety_acknowledgments`, `safety_incidents` | Policy library, PPE setup, acknowledgments, incident workflow. |
| Checklists | `pre_pour_checklists`, `pre_pour_checklist_items`, `post_pour_checklists`, `post_pour_checklist_items`, `tool_checklists`, `tool_checklist_items` | Job readiness and field closeout workflows. |
| Finance/Changes | `change_order_requests`, `calculator_results` | Change requests and saved concrete calculator results. |
| AI/Scout | `opportunity_search_profiles`, `found_opportunities` | Review-first opportunity scout records. |
| Ops | `queue_items`, `activity`, `audit_events` | Work queue, activity stream, audit trail. |

## Indexing Rules

The migration prioritizes composite tenant indexes for the app's most common access paths:

- tenant list views: `(company_id, sort_index)`
- active board filters: `(company_id, status) where archived_at is null`
- schedule/report lookup: `(company_id, scheduled_start)`, `(company_id, job_id, report_date)`
- audit/activity streams: `(company_id, sort_index)`
- authenticated sessions: `token_hash`, `expires_at`, `current_company_id`

A follow-up migration creates covering indexes for any public foreign key that is not already covered by a left-prefix index. Run that migration before importing production-sized data.

## Type Decisions

| Source Pattern | Postgres Target | Reason |
| --- | --- | --- |
| SQLite JSON strings | `jsonb` | Queryable and safer for arrays/objects such as checklists, warning lists, and AI extraction metadata. |
| SQLite integer booleans | `boolean` | Removes boolean coercion ambiguity. |
| Existing text IDs | `text` | Preserves current app references during the first migration. |
| Money/yardage values | `numeric` | Avoids floating point drift for billing-facing values. |
| Created/updated fields | `timestamptz` | Supports production auditing and cross-timezone operation. |

## Runtime Cutover Boundary

This schema does not by itself switch the application runtime. The safe cutover sequence is:

1. Apply the migration to a disposable Supabase/Postgres database.
2. Export a SQLite backup with the existing backup tooling.
3. Transform SQLite rows into Postgres row shapes, converting empty-string foreign keys to `null` and JSON strings to `jsonb`.
4. Run tenant/RLS tests as a restricted DB role.
5. Wire a Postgres store adapter behind an explicit feature gate.
6. Run the same auth, company-scope, backup, restore, and smoke suites against both providers.
7. Promote only after staging parity and rollback are documented.
