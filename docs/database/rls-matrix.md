# Apex HQ RLS Matrix

Last updated: 2026-05-24

## Policy Model

The Postgres/Supabase migrations use a single tenant helper:

`app_private.company_matches(company_id)`

That helper resolves the current company from either:

- `app.current_company_id`, set by the future server-side Postgres adapter inside each transaction.
- Supabase JWT claims (`current_company_id` or `app_metadata.current_company_id`) if the app later moves specific reads to Supabase client access.

The helper functions live in `app_private`, use pinned `search_path` settings, and grant schema/function access to `authenticated` so RLS policies can evaluate without exposing helper internals to anonymous clients.

The current app still performs authorization in Express using custom users, roles, and permissions. RLS is the database-level tenant isolation rail that must be tested before any direct Supabase access is enabled.

## Tenant Policies

| Tables | Policy | Access Rule |
| --- | --- | --- |
| `companies` | `companies_tenant_isolation` | Row `id` must match current company. |
| `company_settings`, `users`, `customers`, `leads`, `lead_sources`, `lead_status_history`, `contact_history`, `jobs`, `job_assignments`, `job_draft_imports`, `estimates`, `rate_book_items`, `safety_policies`, `ppe_items`, `safety_acknowledgments`, `safety_incidents`, `change_order_requests`, `delivery_tickets`, `pre_pour_checklists`, `pre_pour_checklist_items`, `post_pour_checklists`, `post_pour_checklist_items`, `tool_checklists`, `tool_checklist_items`, `calculator_results`, `time_entries`, `daily_reports`, `uploads`, `queue_items`, `activity`, `audit_events`, `opportunity_search_profiles`, `found_opportunities` | `tenant_isolation` | Row `company_id` must match current company for select, insert, update, and delete. |
| `estimate_items` | `estimate_items_tenant_isolation` | Parent `estimates.company_id` must match current company. |
| `sessions` | `sessions_own_user` | Only the current app user and current company can select; grants are revoked from `authenticated` by default. |
| `app_meta` | `app_meta_no_client_access` | Explicit deny policy for `authenticated`; grants are revoked from `anon` and `authenticated`. |

All client-facing policies are scoped `to authenticated`.

## Required Negative Tests Before Runtime Cutover

- A user scoped to Company A cannot select Company B `leads`.
- A user scoped to Company A cannot insert a `job` with Company B `company_id`.
- A user scoped to Company A cannot update Company B `uploads`.
- A user scoped to Company A cannot read `estimate_items` attached to Company B estimates.
- `sessions` and `app_meta` cannot be read by `authenticated`.
- The runtime adapter sets `app.current_company_id` inside the same transaction as each query.

## Role Boundary

RLS is tenant isolation only. App roles still decide feature access:

- Owner/admin/ops/estimator/foreman/employee permissions remain in `shared/permissions.js`.
- Server routes must keep checking feature permissions before writing rows.
- RLS must never be treated as a replacement for app-level authorization.

## Cutover Gate

Do not enable direct Supabase client reads or a Postgres runtime adapter until the negative RLS tests above are automated and pass against a disposable Postgres database.
