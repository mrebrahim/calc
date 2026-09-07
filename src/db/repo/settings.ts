import { getDb } from '../client';
import { nowIso } from '../ids';
import type { Settings } from '../types';

const DEFAULTS: Omit<Settings, 'id'> = {
  currency: 'EGP',
  locale: 'ar-EG',
  salary_amount: 0,
  salary_day: 1,
  is_pro: 0,
  onboarding_done: 0,
  biometric_lock: 0,
  weekly_report_enabled: 1,
  weekly_report_dow: 5,
  weekly_report_hour: 20,
  dirty: 1,
  updated_at: '',
};

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const row = await db.getFirstAsync<Settings>('select * from settings where id = 1');
  if (row) return row;

  await db.runAsync(
    `insert into settings (id, currency, locale, salary_amount, salary_day, is_pro, onboarding_done,
       biometric_lock, weekly_report_enabled, weekly_report_dow, weekly_report_hour, dirty, updated_at)
     values (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    DEFAULTS.currency,
    DEFAULTS.locale,
    DEFAULTS.salary_amount,
    DEFAULTS.salary_day,
    DEFAULTS.is_pro,
    DEFAULTS.onboarding_done,
    DEFAULTS.biometric_lock,
    DEFAULTS.weekly_report_enabled,
    DEFAULTS.weekly_report_dow,
    DEFAULTS.weekly_report_hour,
    nowIso()
  );
  return { id: 1, ...DEFAULTS, updated_at: nowIso() };
}

type Writable = Partial<Omit<Settings, 'id' | 'dirty' | 'updated_at'>>;

const ALLOWED: (keyof Writable)[] = [
  'currency',
  'locale',
  'salary_amount',
  'salary_day',
  'is_pro',
  'onboarding_done',
  'biometric_lock',
  'weekly_report_enabled',
  'weekly_report_dow',
  'weekly_report_hour',
];

export async function updateSettings(patch: Writable): Promise<void> {
  const keys = ALLOWED.filter((k) => patch[k] !== undefined);
  if (keys.length === 0) return;

  await getSettings(); // make sure row 1 exists
  const db = await getDb();
  const assignments = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => patch[k] as string | number);
  await db.runAsync(
    `update settings set ${assignments}, dirty = 1, updated_at = ? where id = 1`,
    ...values,
    nowIso()
  );
}
