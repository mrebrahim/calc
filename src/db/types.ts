export type TxType = 'expense' | 'income';
export type TxSource = 'manual' | 'sms' | 'voice' | 'recurring' | 'widget' | 'ocr';
export type DebtDirection = 'owed_to' | 'owed_by';

/** Rows carry sync bookkeeping that never leaves the device. */
export interface SyncMeta {
  /** 1 when the local row has changes the server has not acknowledged. */
  dirty: number;
  /** Server `updated_at` (ISO) — the last value we know the server has. */
  updated_at: string;
  /** Tombstone. Rows are never hard-deleted locally until sync confirms. */
  deleted_at: string | null;
}

export interface Settings {
  id: number; // always 1
  currency: string;
  locale: string;
  salary_amount: number;
  salary_day: number;
  is_pro: number;
  onboarding_done: number;
  biometric_lock: number;
  weekly_report_enabled: number;
  weekly_report_dow: number;
  weekly_report_hour: number;
  dirty: number;
  updated_at: string;
}

export interface Category extends SyncMeta {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  is_default: number;
  monthly_limit: number | null;
  sort_order: number;
}

export interface Transaction extends SyncMeta {
  id: string;
  amount: number;
  type: TxType;
  category_id: string | null;
  note: string | null;
  occurred_at: string;
  source: TxSource;
}

export interface Recurring extends SyncMeta {
  id: string;
  title: string;
  amount: number;
  type: TxType;
  category_id: string | null;
  day_of_month: number;
  is_active: number;
  last_run_on: string | null;
}

export interface Debt extends SyncMeta {
  id: string;
  person_name: string;
  amount: number;
  direction: DebtDirection;
  due_date: string | null;
  settled: number;
  note: string | null;
}

export interface Goal extends SyncMeta {
  id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  deadline: string | null;
}

export type SyncableTable = 'categories' | 'transactions' | 'recurring' | 'debts' | 'goals';
