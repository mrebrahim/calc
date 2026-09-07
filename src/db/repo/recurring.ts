import { getDb } from '../client';
import { newId, nowIso } from '../ids';
import { daysInMonth, salaryDateFor, startOfDay, toDateOnly } from '../../lib/date';
import { addTransaction } from './transactions';
import type { Recurring, TxType } from '../types';

export async function listRecurring(): Promise<Recurring[]> {
  const db = await getDb();
  return db.getAllAsync<Recurring>(
    'select * from recurring where deleted_at is null order by day_of_month asc'
  );
}

export async function addRecurring(input: {
  title: string;
  amount: number;
  dayOfMonth: number;
  categoryId?: string | null;
  type?: TxType;
}): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `insert into recurring (id, title, amount, type, category_id, day_of_month, is_active, dirty, updated_at)
     values (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
    id,
    input.title,
    input.amount,
    input.type ?? 'expense',
    input.categoryId ?? null,
    input.dayOfMonth,
    nowIso()
  );
  return id;
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'update recurring set is_active = ?, dirty = 1, updated_at = ? where id = ?',
    active ? 1 : 0,
    nowIso(),
    id
  );
}

export async function deleteRecurring(id: string): Promise<void> {
  const db = await getDb();
  const stamp = nowIso();
  await db.runAsync(
    'update recurring set deleted_at = ?, dirty = 1, updated_at = ? where id = ?',
    stamp,
    stamp,
    id
  );
}

/** The date a monthly rule falls on in a given month, clamped to month length. */
function occurrenceIn(year: number, monthIndex: number, dayOfMonth: number): Date {
  const day = Math.min(dayOfMonth, daysInMonth(year, monthIndex));
  return startOfDay(new Date(year, monthIndex, day));
}

/**
 * Turns due recurring rules into real transactions.
 *
 * Runs on every launch and is idempotent: `last_run_on` records the
 * occurrence already materialised, so reopening the app the same day — or
 * after the phone was off for a week — never double-charges.
 * Missed months are backfilled (up to 12) so a returning user's history is
 * not silently short.
 */
export async function materialiseRecurring(now = new Date()): Promise<number> {
  const db = await getDb();
  const rules = await db.getAllAsync<Recurring>(
    'select * from recurring where deleted_at is null and is_active = 1'
  );
  const today = startOfDay(now);
  let created = 0;

  for (const rule of rules) {
    const lastRun = rule.last_run_on ? startOfDay(new Date(rule.last_run_on)) : null;
    let latest = lastRun;

    for (let back = 11; back >= 0; back -= 1) {
      const probe = new Date(today.getFullYear(), today.getMonth() - back, 1);
      const due = occurrenceIn(probe.getFullYear(), probe.getMonth(), rule.day_of_month);
      if (due.getTime() > today.getTime()) continue;
      if (lastRun && due.getTime() <= lastRun.getTime()) continue;

      await addTransaction({
        amount: rule.amount,
        type: rule.type,
        categoryId: rule.category_id,
        note: rule.title,
        occurredAt: due,
        source: 'recurring',
      });
      created += 1;
      latest = due;
    }

    if (latest && latest !== lastRun) {
      await db.runAsync(
        'update recurring set last_run_on = ?, dirty = 1, updated_at = ? where id = ?',
        toDateOnly(latest),
        nowIso(),
        rule.id
      );
    }
  }
  return created;
}

/**
 * Active rules still to be charged before the next salary — subtracted from
 * the pool up front so the daily allowance never promises money that is
 * already committed to rent.
 */
export async function committedBefore(from: Date, until: Date): Promise<number> {
  const rules = await listRecurring();
  let total = 0;

  for (const rule of rules) {
    if (!rule.is_active || rule.type !== 'expense') continue;
    const lastRun = rule.last_run_on ? startOfDay(new Date(rule.last_run_on)) : null;
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);

    for (let i = 0; i < 2; i += 1) {
      const due = occurrenceIn(cursor.getFullYear(), cursor.getMonth() + i, rule.day_of_month);
      const alreadyCharged = lastRun !== null && due.getTime() <= lastRun.getTime();
      if (!alreadyCharged && due.getTime() >= from.getTime() && due.getTime() < until.getTime()) {
        total += rule.amount;
      }
    }
  }
  return total;
}

/** Re-exported so callers do not need to reach into lib/date for the cycle. */
export { salaryDateFor };
