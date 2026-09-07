import type { SyncableTable } from '../db/types';

export interface TableSpec {
  /** Columns shared by SQLite and Postgres, in insert order. */
  columns: string[];
  /** Columns stored as 0/1 locally and boolean on the server. */
  booleans: string[];
}

/**
 * `dirty` is local-only bookkeeping and never crosses the wire; `user_id` is
 * added on push and dropped on pull.
 */
export const TABLES: Record<SyncableTable, TableSpec> = {
  categories: {
    columns: [
      'id', 'slug', 'name', 'icon', 'color', 'is_default',
      'monthly_limit', 'sort_order', 'updated_at', 'deleted_at',
    ],
    booleans: ['is_default'],
  },
  transactions: {
    columns: [
      'id', 'amount', 'type', 'category_id', 'note',
      'occurred_at', 'source', 'updated_at', 'deleted_at',
    ],
    booleans: [],
  },
  recurring: {
    columns: [
      'id', 'title', 'amount', 'type', 'category_id', 'day_of_month',
      'is_active', 'last_run_on', 'updated_at', 'deleted_at',
    ],
    booleans: ['is_active'],
  },
  debts: {
    columns: [
      'id', 'person_name', 'amount', 'direction', 'due_date',
      'settled', 'note', 'updated_at', 'deleted_at',
    ],
    booleans: ['settled'],
  },
  goals: {
    columns: [
      'id', 'title', 'target_amount', 'saved_amount',
      'deadline', 'updated_at', 'deleted_at',
    ],
    booleans: [],
  },
};

/** Categories first: transactions and rules reference them. */
export const SYNC_ORDER: SyncableTable[] = [
  'categories',
  'transactions',
  'recurring',
  'debts',
  'goals',
];

export const SETTINGS_COLUMNS = [
  'currency', 'locale', 'salary_amount', 'salary_day', 'is_pro',
  'onboarding_done', 'biometric_lock', 'weekly_report_enabled',
  'weekly_report_dow', 'weekly_report_hour', 'updated_at',
];

export const SETTINGS_BOOLEANS = [
  'is_pro', 'onboarding_done', 'biometric_lock', 'weekly_report_enabled',
];
