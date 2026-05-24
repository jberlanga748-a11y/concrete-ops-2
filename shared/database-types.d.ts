export type DataProvider = "sqlite" | "postgres";

export type ISODateTime = string;
export type JsonObject = Record<string, unknown>;
export type JsonArray = unknown[];

export interface TimestampedRow {
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface TenantRow {
  company_id: string;
}

export interface SoftDeleteRow {
  archived_at: ISODateTime | null;
}

export interface CompanyRow extends TimestampedRow {
  id: string;
  workspace_id: string;
  name: string;
  status: "active" | "inactive";
}

export interface CompanySettingRow {
  company_id: string;
  key: string;
  value: string;
  updated_at: ISODateTime;
}

export interface UserRow extends TenantRow, TimestampedRow {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: "Owner" | "Administrator" | "Operations Manager" | "Estimator" | "Foreman" | "Employee" | string;
  status: "active" | "inactive";
  operator_access: boolean;
  notification_state: JsonObject;
  invite_token_hash: string;
  invite_sent_at: ISODateTime | null;
  invite_expires_at: ISODateTime | null;
  invite_accepted_at: ISODateTime | null;
  must_set_password: boolean;
  reset_token_hash: string;
  reset_requested_at: ISODateTime | null;
  reset_expires_at: ISODateTime | null;
  reset_used_at: ISODateTime | null;
  last_login_at: ISODateTime | null;
  password_hash: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  current_company_id: string;
  created_at: ISODateTime;
  last_seen_at: ISODateTime;
  expires_at: ISODateTime;
}

export interface CustomerRow extends TenantRow, TimestampedRow, SoftDeleteRow {
  id: string;
  sort_index: number;
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  service_area: string;
  status: "Prospect" | "Active" | "Inactive" | string;
  notes: string;
}

export interface LeadRow extends TenantRow, TimestampedRow, SoftDeleteRow {
  id: string;
  sort_index: number;
  customer_id: string | null;
  customer: string;
  city: string;
  project: string;
  trade: string;
  status: string;
  priority: "Low" | "Normal" | "High" | string;
  value: number;
  owner: string;
  owner_id: string | null;
  age: string;
  source: string;
  follow_up_due_at: string;
  next_step: string;
  notes: string;
  fit_score: number;
  fit_label: string;
  fit_reason: string;
  fit_risks: JsonArray;
  fit_next_step: string;
  score_source: string;
  scored_at: ISODateTime | null;
  missing_info_status: string;
  missing_info_count: number;
  missing_info_items: JsonArray;
  missing_info_next_step: string;
  missing_info_checked_at: ISODateTime | null;
}

export interface JobRow extends TenantRow, TimestampedRow, SoftDeleteRow {
  id: string;
  sort_index: number;
  customer_id: string | null;
  lead_id: string | null;
  title: string;
  job: string;
  customer: string;
  address: string;
  site_contact: string;
  scope_summary: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_duration: string;
  crew_size_needed: number;
  assigned_foreman_id: string | null;
  assigned_user_id: string | null;
  field_planning_visible: boolean;
  visible_to_foreman: boolean;
  status: string;
  progress: number;
  startup_checklist: JsonArray;
  startup_status: string;
}

export interface EstimateRow extends TenantRow, TimestampedRow, SoftDeleteRow {
  id: string;
  sort_index: number;
  customer_id: string;
  lead_id: string | null;
  job_id: string | null;
  customer_email: string | null;
  title: string;
  status: string;
  subtotal: string;
  tax_rate: string | null;
  tax_total: string | null;
  fees_total: string | null;
  grand_total: string;
  created_by: string;
  sent_at: ISODateTime | null;
  approved_at: ISODateTime | null;
  rejected_at: ISODateTime | null;
}

export interface EstimateItemRow extends TimestampedRow {
  id: string;
  sort_index: number;
  estimate_id: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  line_total: string;
  sort_order: number;
}

export interface UploadRow extends TenantRow, TimestampedRow, SoftDeleteRow {
  id: string;
  sort_index: number;
  job_id: string;
  customer_id: string | null;
  report_id: string | null;
  incident_id: string | null;
  change_order_id: string | null;
  tool_checklist_item_id: string | null;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  caption: string;
  notes: string;
  taken_at: ISODateTime;
  uploaded_at: ISODateTime;
  latitude: string | null;
  longitude: string | null;
}

export interface AuditEventRow extends TenantRow {
  id: string;
  sort_index: number;
  entity_type: string;
  entity_id: string | null;
  action: string;
  summary: string;
  detail: string;
  actor_user_id: string | null;
  actor_name: string;
  changed_fields: JsonArray;
  created_at: ISODateTime;
}

export interface ApexHqDatabaseTables {
  app_meta: { key: string; value: string };
  companies: CompanyRow;
  company_settings: CompanySettingRow;
  users: UserRow;
  sessions: SessionRow;
  customers: CustomerRow;
  leads: LeadRow;
  lead_sources: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  lead_status_history: TenantRow & Record<string, unknown>;
  contact_history: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  jobs: JobRow;
  job_assignments: TenantRow & TimestampedRow & Record<string, unknown>;
  job_draft_imports: TenantRow & TimestampedRow & Record<string, unknown>;
  estimates: EstimateRow;
  estimate_items: EstimateItemRow;
  rate_book_items: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  safety_policies: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  ppe_items: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  safety_acknowledgments: TenantRow & Record<string, unknown>;
  safety_incidents: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  change_order_requests: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  delivery_tickets: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  pre_pour_checklists: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  pre_pour_checklist_items: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  post_pour_checklists: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  post_pour_checklist_items: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  tool_checklists: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  tool_checklist_items: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  calculator_results: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  time_entries: TenantRow & TimestampedRow & Record<string, unknown>;
  daily_reports: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  uploads: UploadRow;
  queue_items: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  activity: TenantRow & TimestampedRow & Record<string, unknown>;
  audit_events: AuditEventRow;
  opportunity_search_profiles: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
  found_opportunities: TenantRow & TimestampedRow & SoftDeleteRow & Record<string, unknown>;
}

export type ApexHqTableName = keyof ApexHqDatabaseTables;
export type ApexHqRow<TTable extends ApexHqTableName> = ApexHqDatabaseTables[TTable];
