export interface Driver {
  id: number;
  name: string;
  scanned_at: string;
  completed_at?: string;
  status: 'waiting' | 'on_break' | 'checked_out';
  office_id: string;
  break_started_at?: string;
  device_id?: string;
}

export interface DashboardDriversResponse {
  waiting: Driver[];
  on_break: Driver[];
  completed: Driver[];
}

export type DriverVariant = 'waiting' | 'next' | 'done' | 'on_break';
