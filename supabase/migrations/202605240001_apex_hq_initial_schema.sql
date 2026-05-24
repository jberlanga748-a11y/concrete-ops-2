-- Apex HQ production data-platform foundation.
-- This migration mirrors the current SQLite-backed domain model in PostgreSQL
-- and adds tenant-scoped RLS policies for the future Supabase/Postgres runtime.

begin;

create extension if not exists pgcrypto;

create schema if not exists app_private;

create or replace function app_private.jwt_claims()
returns jsonb
language plpgsql
stable
as $$
begin
  return coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
exception
  when others then
    return '{}'::jsonb;
end;
$$;

create or replace function app_private.current_company_id()
returns text
language sql
stable
as $$
  select nullif(coalesce(
    nullif(current_setting('app.current_company_id', true), ''),
    nullif(app_private.jwt_claims() ->> 'current_company_id', ''),
    nullif(app_private.jwt_claims() -> 'app_metadata' ->> 'current_company_id', '')
  ), '');
$$;

create or replace function app_private.current_app_user_id()
returns text
language sql
stable
as $$
  select nullif(coalesce(
    nullif(current_setting('app.current_user_id', true), ''),
    nullif(app_private.jwt_claims() ->> 'app_user_id', ''),
    nullif(app_private.jwt_claims() ->> 'sub', '')
  ), '');
$$;

create or replace function app_private.company_matches(target_company_id text)
returns boolean
language sql
stable
as $$
  select target_company_id is not null
    and app_private.current_company_id() is not null
    and target_company_id = app_private.current_company_id();
$$;

create table if not exists app_meta (
  key text primary key,
  value text not null
);

create table if not exists companies (
  id text primary key,
  workspace_id text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_status_check check (status in ('active', 'inactive'))
);

create table if not exists company_settings (
  company_id text not null references companies(id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (company_id, key)
);

create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  phone text not null default '',
  role text not null,
  status text not null default 'active',
  company_id text not null references companies(id) on delete cascade,
  operator_access boolean not null default false,
  notification_state jsonb not null default '{}'::jsonb,
  invite_token_hash text not null default '',
  invite_sent_at timestamptz,
  invite_expires_at timestamptz,
  invite_accepted_at timestamptz,
  must_set_password boolean not null default false,
  reset_token_hash text not null default '',
  reset_requested_at timestamptz,
  reset_expires_at timestamptz,
  reset_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  password_hash text not null,
  constraint users_status_check check (status in ('active', 'inactive'))
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  current_company_id text not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists customers (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  name text not null,
  company text not null default '',
  phone text not null default '',
  email text not null default '',
  city text not null default '',
  service_area text not null default '',
  status text not null default 'Prospect',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists leads (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  customer_id text references customers(id) on delete set null,
  customer text not null,
  city text not null default '',
  project text not null,
  trade text not null default '',
  status text not null,
  priority text not null,
  value integer not null default 0,
  owner text not null default '',
  owner_id text references users(id) on delete set null,
  age text not null default '',
  source text not null default '',
  follow_up_due_at text not null default '',
  next_step text not null default '',
  notes text not null default '',
  fit_score integer not null default 0,
  fit_label text not null default '',
  fit_reason text not null default '',
  fit_risks jsonb not null default '[]'::jsonb,
  fit_next_step text not null default '',
  score_source text not null default '',
  scored_at timestamptz,
  missing_info_status text not null default '',
  missing_info_count integer not null default 0,
  missing_info_items jsonb not null default '[]'::jsonb,
  missing_info_next_step text not null default '',
  missing_info_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists lead_sources (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  name text not null,
  type text not null,
  url text not null default '',
  city text not null default '',
  state text not null default '',
  service_area text not null default '',
  trade_focus text not null default '',
  notes text not null default '',
  status text not null,
  check_cadence text not null default '',
  last_checked_at timestamptz,
  next_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists lead_status_history (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  lead_id text not null references leads(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text not null default '',
  actor_user_id text references users(id) on delete set null,
  actor_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists contact_history (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  method text not null default 'Call',
  direction text not null default 'outbound',
  outcome text not null default 'Follow-Up Needed',
  subject text not null default '',
  message_draft text not null default '',
  notes text not null default '',
  contacted_at timestamptz not null default now(),
  next_follow_up_date text not null default '',
  created_by text references users(id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists jobs (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  customer_id text references customers(id) on delete set null,
  lead_id text references leads(id) on delete set null,
  title text not null default '',
  job text not null default '',
  customer text not null default '',
  address text not null default '',
  site_contact text not null default '',
  scope_summary text not null default '',
  scheduled_start text not null default '',
  scheduled_end text not null default '',
  estimated_duration text not null default '',
  crew_size_needed integer not null default 0,
  equipment_notes text not null default '',
  safety_notes text not null default '',
  material_notes text not null default '',
  field_notes text not null default '',
  assigned_foreman_id text references users(id) on delete set null,
  assigned_user_id text references users(id) on delete set null,
  field_planning_visible boolean not null default false,
  visible_to_foreman boolean not null default false,
  status text not null,
  stage text not null default '',
  crew text not null default '',
  next_step text not null default '',
  next_step_v2 text not null default '',
  due text not null default '',
  progress integer not null default 0,
  notes text not null default '',
  startup_checklist jsonb not null default '[]'::jsonb,
  startup_status text not null default 'Not Started',
  startup_completed_at timestamptz,
  startup_completed_by text references users(id) on delete set null,
  startup_notes text not null default '',
  source_imported_draft_id text not null default '',
  startup_last_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists job_assignments (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  job_id text not null references jobs(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role_on_job text not null,
  assigned_by text references users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  notes text not null default '',
  notice_acknowledged_at timestamptz,
  notice_acknowledged_by text references users(id) on delete set null,
  notice_acknowledged_key text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_draft_imports (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  imported_at timestamptz not null default now(),
  import_status text not null,
  import_warnings jsonb not null default '[]'::jsonb,
  original_package jsonb not null default '{}'::jsonb,
  package_version text not null default '',
  exported_at text not null default '',
  source_app text not null default '',
  package_type text not null default '',
  ops_job_draft_id text not null default '',
  source_handoff_id text not null default '',
  source_lead_id text not null default '',
  source_proposal_id text not null default '',
  source_estimate_id text not null default '',
  source_packet_id text not null default '',
  customer_name text not null default '',
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  job_name text not null default '',
  job_address text not null default '',
  city text not null default '',
  state text not null default '',
  service_type text not null default '',
  project_type text not null default '',
  scope_summary text not null default '',
  included_scope jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  operations_notes text not null default '',
  crew_notes text not null default '',
  schedule_notes text not null default '',
  start_date_target text not null default '',
  assigned_crew_placeholder text not null default '',
  foreman_placeholder text not null default '',
  draft_status text not null default '',
  ops_readiness_score text not null default '',
  ops_readiness_label text not null default '',
  ops_readiness_issues jsonb not null default '[]'::jsonb,
  proposal_amount text not null default '',
  proposal_link_or_id text not null default '',
  handoff_status text not null default '',
  job_draft_summary text not null default '',
  matched_customer_id text not null default '',
  matched_customer_name text not null default '',
  matched_contact_id text not null default '',
  customer_match_status text not null default 'Not Checked',
  customer_match_confidence text not null default '',
  customer_match_reason text not null default '',
  customer_match_candidates jsonb not null default '[]'::jsonb,
  customer_match_reviewed_at timestamptz,
  customer_match_override_reason text not null default '',
  created_job_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists estimates (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  customer_id text not null references customers(id) on delete cascade,
  lead_id text references leads(id) on delete set null,
  job_id text references jobs(id) on delete set null,
  customer_email text,
  title text not null,
  status text not null,
  scope_summary text not null default '',
  internal_notes text not null default '',
  customer_notes text not null default '',
  subtotal numeric(12, 2) not null default 0,
  tax_rate numeric(8, 4),
  tax_total numeric(12, 2),
  fees_total numeric(12, 2),
  grand_total numeric(12, 2) not null default 0,
  created_by text not null references users(id) on delete cascade,
  sent_at timestamptz,
  sent_by text references users(id) on delete set null,
  sent_to text,
  email_subject text,
  provider_message_id text,
  approved_at timestamptz,
  rejected_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists estimate_items (
  id text primary key,
  sort_index integer not null,
  estimate_id text not null references estimates(id) on delete cascade,
  description text not null,
  quantity numeric(12, 3) not null default 0,
  unit text not null default 'ea',
  unit_price numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rate_book_items (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  category text not null,
  trade text not null default '',
  title text not null,
  description text not null default '',
  unit text not null default 'ea',
  unit_cost numeric(12, 2) not null default 0,
  markup_percent numeric(8, 4) not null default 0,
  unit_price numeric(12, 2) not null default 0,
  taxable boolean not null default true,
  status text not null default 'active',
  created_by text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists safety_policies (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null,
  status text not null,
  created_by text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists ppe_items (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  label text not null,
  description text not null default '',
  required_by_default boolean not null default false,
  status text not null,
  created_by text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists safety_acknowledgments (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  job_id text references jobs(id) on delete set null,
  policy_id text references safety_policies(id) on delete set null,
  acknowledged_at timestamptz not null default now(),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists safety_incidents (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  job_id text references jobs(id) on delete set null,
  submitted_by text not null references users(id) on delete cascade,
  type text not null,
  severity text not null,
  status text not null,
  title text not null,
  description text not null default '',
  immediate_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by text references users(id) on delete set null,
  reviewed_at timestamptz,
  resolved_at timestamptz,
  archived_at timestamptz
);

create table if not exists change_order_requests (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  job_id text not null references jobs(id) on delete cascade,
  customer_id text references customers(id) on delete set null,
  requested_by text not null references users(id) on delete cascade,
  reason text not null,
  scope_description text not null default '',
  field_notes text not null default '',
  status text not null,
  office_notes text not null default '',
  reviewed_by text references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists delivery_tickets (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  job_id text not null references jobs(id) on delete cascade,
  report_id text,
  created_by text not null references users(id) on delete cascade,
  supplier text not null,
  truck_number text not null default '',
  ticket_number text not null default '',
  yards_delivered numeric(10, 2) not null default 0,
  arrival_time text not null default '',
  discharge_time text not null default '',
  mix_notes text not null default '',
  psi numeric(10, 2),
  slump numeric(10, 2),
  ticket_upload_id text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists pre_pour_checklists (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  job_id text not null references jobs(id) on delete cascade,
  status text not null,
  created_by text not null references users(id) on delete cascade,
  completed_by text references users(id) on delete set null,
  reviewed_by text references users(id) on delete set null,
  reopened_by text references users(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  reviewed_at timestamptz,
  reopened_at timestamptz,
  archived_at timestamptz
);

create table if not exists pre_pour_checklist_items (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  checklist_id text not null references pre_pour_checklists(id) on delete cascade,
  key text not null,
  label text not null,
  status text not null,
  notes text not null default '',
  checked_by text references users(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists post_pour_checklists (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  job_id text not null references jobs(id) on delete cascade,
  status text not null,
  created_by text not null references users(id) on delete cascade,
  completed_by text references users(id) on delete set null,
  reviewed_by text references users(id) on delete set null,
  reopened_by text references users(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  reviewed_at timestamptz,
  reopened_at timestamptz,
  archived_at timestamptz
);

create table if not exists post_pour_checklist_items (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  checklist_id text not null references post_pour_checklists(id) on delete cascade,
  key text not null,
  label text not null,
  status text not null,
  notes text not null default '',
  checked_by text references users(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists tool_checklists (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  job_id text references jobs(id) on delete set null,
  title text not null,
  status text not null,
  created_by text not null references users(id) on delete cascade,
  assigned_foreman_id text references users(id) on delete set null,
  submitted_by text references users(id) on delete set null,
  reviewed_by text references users(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  archived_at timestamptz
);

create table if not exists tool_checklist_items (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  checklist_id text not null references tool_checklists(id) on delete cascade,
  name text not null,
  category text not null,
  quantity integer not null default 1,
  status text not null,
  added_by text not null references users(id) on delete cascade,
  notes text not null default '',
  missing_notes text not null default '',
  damaged_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists calculator_results (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  job_id text not null references jobs(id) on delete cascade,
  created_by text not null references users(id) on delete cascade,
  calculator_type text not null,
  inputs_json jsonb not null default '{}'::jsonb,
  waste_percent numeric(8, 4) not null default 0,
  cubic_feet numeric(14, 4) not null default 0,
  cubic_yards numeric(14, 4) not null default 0,
  cubic_yards_with_waste numeric(14, 4) not null default 0,
  summary text not null default '',
  visibility text not null default 'internal',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists time_entries (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  job_id text references jobs(id) on delete cascade,
  work_category text not null default 'job',
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  break_start_at timestamptz,
  break_end_at timestamptz,
  total_minutes integer not null default 0,
  break_minutes integer not null default 0,
  status text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_reports (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  job_id text not null references jobs(id) on delete cascade,
  report_date date not null,
  status text not null,
  created_by text not null references users(id) on delete cascade,
  submitted_by text references users(id) on delete set null,
  reviewed_by text references users(id) on delete set null,
  crew_summary text not null default '',
  work_performed text not null default '',
  delays text not null default '',
  safety_notes text not null default '',
  equipment_used text not null default '',
  material_notes text not null default '',
  concrete_poured boolean not null default false,
  yards_poured numeric(10, 2) not null default 0,
  weather text not null default '',
  visitor_notes text not null default '',
  inspection_notes text not null default '',
  general_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reopened_at timestamptz,
  archived_at timestamptz
);

create table if not exists uploads (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  job_id text not null references jobs(id) on delete cascade,
  customer_id text references customers(id) on delete set null,
  report_id text references daily_reports(id) on delete set null,
  incident_id text references safety_incidents(id) on delete set null,
  change_order_id text references change_order_requests(id) on delete set null,
  tool_checklist_item_id text references tool_checklist_items(id) on delete set null,
  uploaded_by text not null references users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null default 0,
  storage_path text not null,
  caption text not null default '',
  notes text not null default '',
  taken_at timestamptz not null,
  uploaded_at timestamptz not null default now(),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  location_accuracy numeric(10, 2),
  location_captured_at timestamptz,
  location_unavailable_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists queue_items (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  title text not null,
  meta text not null default '',
  status text not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists activity (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  time text not null default '',
  title text not null,
  detail text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_events (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  entity_type text not null,
  entity_id text,
  action text not null,
  summary text not null,
  detail text not null default '',
  actor_user_id text references users(id) on delete set null,
  actor_name text not null default '',
  changed_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists opportunity_search_profiles (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  name text not null,
  trades jsonb not null default '[]'::jsonb,
  service_areas jsonb not null default '[]'::jsonb,
  radius_miles integer not null default 0,
  source_types jsonb not null default '[]'::jsonb,
  source_adapter_id text not null default 'manual',
  source_access_status text not null default 'clear_for_review',
  source_terms_status text not null default 'unreviewed',
  source_policy_note text not null default '',
  keywords jsonb not null default '[]'::jsonb,
  excluded_keywords jsonb not null default '[]'::jsonb,
  cadence text not null default '',
  status text not null,
  notes text not null default '',
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists found_opportunities (
  id text primary key,
  sort_index integer not null,
  company_id text not null references companies(id) on delete cascade,
  search_profile_id text not null references opportunity_search_profiles(id) on delete cascade,
  lead_source_id text references lead_sources(id) on delete set null,
  intake_source_type text not null default 'manual',
  intake_text text not null default '',
  file_metadata jsonb not null default '[]'::jsonb,
  extraction_summary text not null default '',
  extraction_confidence integer not null default 0,
  title text not null,
  agency text not null default '',
  source_name text not null default '',
  source_url text not null default '',
  city text not null default '',
  state text not null default '',
  trade text not null default '',
  project_type text not null default '',
  status text not null,
  fit_score integer not null default 0,
  fit_label text not null default '',
  fit_explanation text not null default '',
  urgency_score integer not null default 0,
  distance_score integer not null default 0,
  trade_match_score integer not null default 0,
  bid_due_at timestamptz,
  job_walk_at timestamptz,
  estimated_value integer not null default 0,
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  scope_summary text not null default '',
  plan_url text not null default '',
  reason_to_bid text not null default '',
  reason_to_skip text not null default '',
  risk_flags jsonb not null default '[]'::jsonb,
  missing_info_items jsonb not null default '[]'::jsonb,
  duplicate_hints jsonb not null default '[]'::jsonb,
  human_review_status text not null default 'needs_review',
  human_review_note text not null default '',
  human_reviewed_by text references users(id) on delete set null,
  human_reviewed_at timestamptz,
  assigned_estimator_id text references users(id) on delete set null,
  notes text not null default '',
  converted_lead_id text references leads(id) on delete set null,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists idx_users_company_id on users(company_id);
create index if not exists idx_users_invite_token_hash on users(invite_token_hash) where invite_token_hash <> '';
create index if not exists idx_users_reset_token_hash on users(reset_token_hash) where reset_token_hash <> '';
create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_sessions_token_hash on sessions(token_hash);
create index if not exists idx_sessions_current_company_id on sessions(current_company_id);
create index if not exists idx_sessions_expires_at on sessions(expires_at);

create index if not exists idx_company_settings_company_id on company_settings(company_id);
create index if not exists idx_customers_company_sort on customers(company_id, sort_index);
create index if not exists idx_customers_company_status on customers(company_id, status) where archived_at is null;
create index if not exists idx_leads_company_sort on leads(company_id, sort_index);
create index if not exists idx_leads_company_status on leads(company_id, status) where archived_at is null;
create index if not exists idx_leads_company_owner on leads(company_id, owner_id) where archived_at is null;
create index if not exists idx_jobs_company_sort on jobs(company_id, sort_index);
create index if not exists idx_jobs_company_status on jobs(company_id, status) where archived_at is null;
create index if not exists idx_jobs_company_schedule on jobs(company_id, scheduled_start) where archived_at is null;
create index if not exists idx_estimates_company_sort on estimates(company_id, sort_index);
create index if not exists idx_estimates_company_status on estimates(company_id, status) where archived_at is null;
create index if not exists idx_uploads_company_job on uploads(company_id, job_id) where archived_at is null;
create index if not exists idx_daily_reports_company_job_date on daily_reports(company_id, job_id, report_date);
create index if not exists idx_audit_events_company_sort on audit_events(company_id, sort_index);
create index if not exists idx_activity_company_sort on activity(company_id, sort_index);
create index if not exists idx_queue_items_company_sort on queue_items(company_id, sort_index);
create index if not exists idx_contact_history_company_entity on contact_history(company_id, entity_type, entity_id);
create index if not exists idx_opportunity_profiles_company_sort on opportunity_search_profiles(company_id, sort_index);
create index if not exists idx_found_opportunities_company_status on found_opportunities(company_id, status) where archived_at is null;

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
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists tenant_isolation on public.%I', table_name);
    execute format(
      'create policy tenant_isolation on public.%I for all using (app_private.company_matches(company_id)) with check (app_private.company_matches(company_id))',
      table_name
    );
  end loop;
end;
$$;

alter table companies enable row level security;
drop policy if exists companies_tenant_isolation on companies;
create policy companies_tenant_isolation on companies
for all
using (id = app_private.current_company_id())
with check (id = app_private.current_company_id());

alter table sessions enable row level security;
drop policy if exists sessions_own_user on sessions;
create policy sessions_own_user on sessions
for select
using (
  current_company_id = app_private.current_company_id()
  and user_id = app_private.current_app_user_id()
);

alter table estimate_items enable row level security;
drop policy if exists estimate_items_tenant_isolation on estimate_items;
create policy estimate_items_tenant_isolation on estimate_items
for all
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

alter table app_meta enable row level security;

revoke all on table app_meta from anon, authenticated;
revoke all on table sessions from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on table app_meta from authenticated;
revoke all on table sessions from authenticated;

commit;
