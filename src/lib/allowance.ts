import { addDays, daysBetween, endOfDay, payCycle, startOfDay, startOfWeek } from './date';
import { committedBefore } from '../db/repo/recurring';
import { sumBetween } from '../db/repo/transactions';
import type { Settings } from '../db/types';

export interface Allowance {
  /** Money the user may still spend before the next salary. */
  remaining: number;
  /** Days left including today. Never below 1. */
  daysLeft: number;
  /** remaining / daysLeft — the fair share for a single day. */
  perDay: number;
  /** perDay minus what today already cost. Negative means overspent. */
  availableToday: number;
  spentToday: number;
  spentWeek: number;
  spentCycle: number;
  /** Recurring charges still due before the next salary. */
  committed: number;
  cycleStart: Date;
  cycleEnd: Date;
  /** False when no salary is configured — the UI shows totals instead. */
  hasSalary: boolean;
}

export async function computeAllowance(
  settings: Settings,
  now = new Date()
): Promise<Allowance> {
  const { start: cycleStart, end: cycleEnd } = payCycle(now, settings.salary_day);
  const today = startOfDay(now);

  const [spentCycle, incomeCycle, spentToday, spentWeek, committed] = await Promise.all([
    sumBetween(cycleStart, cycleEnd, 'expense'),
    sumBetween(cycleStart, cycleEnd, 'income'),
    sumBetween(today, endOfDay(now), 'expense'),
    sumBetween(startOfWeek(now), endOfDay(now), 'expense'),
    // Only charges from tomorrow on: anything due today is already spent or
    // already materialised into a transaction by the recurring engine.
    committedBefore(addDays(today, 1), cycleEnd),
  ]);

  const pool = settings.salary_amount + incomeCycle;
  const remaining = pool - spentCycle - committed;
  const daysLeft = Math.max(1, daysBetween(today, cycleEnd));
  const perDay = Math.floor(Math.max(0, remaining + spentToday) / daysLeft);

  return {
    remaining,
    daysLeft,
    perDay,
    availableToday: perDay - spentToday,
    spentToday,
    spentWeek,
    spentCycle,
    committed,
    cycleStart,
    cycleEnd,
    hasSalary: settings.salary_amount > 0,
  };
}
