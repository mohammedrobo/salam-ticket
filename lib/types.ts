export interface Driver {
  id: number;
  name: string;
  scanned_at: string;
  completed_at?: string;
  status: 'waiting' | 'on_break' | 'checked_out';
  office_id: string;
  break_started_at?: string;
  device_id?: string;
  driver_account_id?: string;
}

export interface DashboardDriversResponse {
  waiting: Driver[];
  on_break: Driver[];
  completed: Driver[];
}

export type DriverVariant = 'waiting' | 'next' | 'done' | 'on_break';

export interface DriverAccount {
  id: string;
  device_id: string;
  full_name: string;
  phone: string;
  created_at: string;
}

export interface DeliveryRecord {
  id: string;
  driver_account_id: string;
  office_id: string;
  scanned_at: string;
  completed_at: string;
  duration_seconds: number;
}

export interface DriverStats {
  account: DriverAccount;
  total_deliveries: number;
  deliveries_this_week: number;
  deliveries_this_month: number;
  last_delivery: string | null;
  recent_deliveries: DeliveryRecord[];
  daily_counts: { date: string; count: number }[];
}

export interface AnalyticsSummary {
  total_drivers: number;
  deliveries_this_week: number;
  deliveries_this_month: number;
  avg_per_driver_week: number;
}

export interface DriverAnalyticsRow {
  account: DriverAccount;
  total_deliveries: number;
  deliveries_this_week: number;
  last_delivery: string | null;
}
