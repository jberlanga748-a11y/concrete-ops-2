-- Harden helper access and RLS policy scope after live Supabase validation.

begin;

revoke all on schema app_private from anon;
revoke execute on all functions in schema app_private from anon;
grant usage on schema app_private to authenticated;
grant execute on all functions in schema app_private to authenticated;

alter function app_private.jwt_claims() set search_path = app_private, pg_temp;
alter function app_private.current_company_id() set search_path = app_private, pg_temp;
alter function app_private.current_app_user_id() set search_path = app_private, pg_temp;
alter function app_private.company_matches(text) set search_path = app_private, pg_temp;

do $$
declare
  table_name text;
  tenant_tables text[] := array[
    'company_settings',
    'users',
    'customers',
    'leads',
    'lead_sources',
    'lead_status_history',
    'contact_history',
    'jobs',
    'job_assignments',
    'job_draft_imports',
    'estimates',
    'rate_book_items',
    'safety_policies',
    'ppe_items',
    'safety_acknowledgments',
    'safety_incidents',
    'change_order_requests',
    'delivery_tickets',
    'pre_pour_checklists',
    'pre_pour_checklist_items',
    'post_pour_checklists',
    'post_pour_checklist_items',
    'tool_checklists',
    'tool_checklist_items',
    'calculator_results',
    'time_entries',
    'daily_reports',
    'uploads',
    'queue_items',
    'activity',
    'audit_events',
    'opportunity_search_profiles',
    'found_opportunities'
  ];
begin
  foreach table_name in array tenant_tables loop
    execute format('drop policy if exists tenant_isolation on public.%I', table_name);
    execute format(
      'create policy tenant_isolation on public.%I for all to authenticated using (app_private.company_matches(company_id)) with check (app_private.company_matches(company_id))',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists companies_tenant_isolation on companies;
create policy companies_tenant_isolation on companies
for all
to authenticated
using (id = app_private.current_company_id())
with check (id = app_private.current_company_id());

drop policy if exists sessions_own_user on sessions;
create policy sessions_own_user on sessions
for select
to authenticated
using (
  current_company_id = app_private.current_company_id()
  and user_id = app_private.current_app_user_id()
);

drop policy if exists estimate_items_tenant_isolation on estimate_items;
create policy estimate_items_tenant_isolation on estimate_items
for all
to authenticated
using (
  exists (
    select 1
    from estimates
    where estimates.id = estimate_items.estimate_id
      and app_private.company_matches(estimates.company_id)
  )
)
with check (
  exists (
    select 1
    from estimates
    where estimates.id = estimate_items.estimate_id
      and app_private.company_matches(estimates.company_id)
  )
);

drop policy if exists app_meta_no_client_access on app_meta;
create policy app_meta_no_client_access on app_meta
for all
to authenticated
using (false)
with check (false);

revoke all on table app_meta from anon, authenticated;
revoke all on table sessions from anon, authenticated;

commit;
