// All timestamp fields are Unix epoch integers (i64), never Date or string.

export type TimeRange = 'today' | '24h' | '7d' | '30d';

export interface HealthResponse {
  status: string;
  last_window_start: number | null;
  token_expires_at: number;
  uptime_seconds: number;
}

export interface WindowItem {
  window_start: number;
  wh_produced: number;
  wh_consumed: number;
  wh_grid_import: number;
  wh_grid_export: number;
  is_complete: boolean;
}

export interface WindowsResponse {
  readonly windows: readonly WindowItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface SnapshotItem {
  window_start: number;
  serial_number: string;
  watts_output: number;
  is_online: boolean;
}

export interface SnapshotsResponse {
  readonly snapshots: readonly SnapshotItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface InverterItem {
  serial_number: string;
  watts_output: number;
  is_online: boolean;
}

export interface WindowInvertersResponse {
  window_start: number;
  readonly inverters: readonly InverterItem[];
}

export interface ArraySummary {
  name: string;
  total_watts: number;
  online_count: number;
  total_count: number;
  inverters: readonly InverterItem[];
}

export interface ArraysResponse {
  window_start: number | null;
  readonly arrays: readonly ArraySummary[];
}

export interface TouRefreshResponse {
  schedule_id: number;
  rate_label: string;
  utility_name: string;
  effective_date: string | null;
  fetched_at: number;
}

export interface PeriodDetail {
  import_kwh: number;
  export_kwh: number;
  import_cost_usd: number;
  export_credit_usd: number;
}

export interface EstimateResponse {
  period_start: number;
  period_end: number;
  net_cost_usd: number;
  breakdown: {
    peak: PeriodDetail;
    off_peak: PeriodDetail;
    super_off_peak: PeriodDetail;
  };
  tou_schedule: {
    id: number;
    rate_label: string;
    effective_date: string | null;
  };
  computed_at: number;
}
